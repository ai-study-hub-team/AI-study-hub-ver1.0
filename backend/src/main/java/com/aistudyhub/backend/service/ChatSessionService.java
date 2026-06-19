package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.python.*;
import com.aistudyhub.backend.dto.request.ChatAskRequest;
import com.aistudyhub.backend.dto.request.CreateChatSessionRequest;
import com.aistudyhub.backend.dto.response.*;
import com.aistudyhub.backend.entity.*;
import com.aistudyhub.backend.repository.*;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatSessionService {

    private final ChatSessionRepository chatSessionRepository;
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final ChatSessionDocumentRepository chatSessionDocumentRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final AiCitationRepository aiCitationRepository;
    private final DocumentChunkRepository documentChunkRepository;

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ai.service.base-url}")
    private String aiServiceBaseUrl;

    // ─── Create Chat Session ────────────────────────────────────────────────────

    @Transactional
    public CreateChatSessionResponse createChatSession(CreateChatSessionRequest request) {
        // 1. Find User — throw if not found
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException(
                        "User not found with id: " + request.getUserId()));

        // 2. Determine title — use provided title or fall back to "New Chat"
        String title = (request.getTitle() == null || request.getTitle().isBlank())
                ? "New Chat"
                : request.getTitle();

        // 3. Create and save an empty ChatSession
        LocalDateTime now = LocalDateTime.now();
        ChatSession chatSession = ChatSession.builder()
                .sessionId(UUID.randomUUID().toString())
                .user(user)
                .title(title)
                .createdAt(now)
                .updatedAt(now)
                .build();

        ChatSession savedSession = chatSessionRepository.save(chatSession);

        // 4. Return response
        return CreateChatSessionResponse.builder()
                .sessionId(savedSession.getSessionId())
                .userId(user.getId())
                .title(savedSession.getTitle())
                .createdAt(savedSession.getCreatedAt())
                .build();
    }

    // ─── Ask Chatbot ────────────────────────────────────────────────────────────

    @Transactional
    public ChatAskResponse askChatbot(ChatAskRequest request) {
        log.info("Processing askChatbot request for session: {}", request.getSessionId());

        // 1. Validate User
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException(
                        "User not found with id: " + request.getUserId()));

        // 2. Validate Session
        ChatSession chatSession = chatSessionRepository.findById(request.getSessionId())
                .orElseThrow(() -> new RuntimeException(
                        "Chat session not found with id: " + request.getSessionId()));

        // Check if session belongs to the requesting user
        if (!chatSession.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("This chat session does not belong to the user.");
        }

        // 3. Validate document IDs list
        List<Long> documentIds = request.getDocumentIds();
        if (documentIds == null || documentIds.isEmpty()) {
            throw new RuntimeException("Document IDs list must not be empty.");
        }
        if (documentIds.size() > 5) {
            throw new RuntimeException("Cannot select more than 5 documents per question.");
        }

        // 4. Find, validate existence, and check processStatus for each document
        List<Document> documents = new ArrayList<>();
        for (Long docId : documentIds) {
            Document doc = documentRepository.findById(docId)
                    .orElseThrow(() -> new RuntimeException("Document not found with id: " + docId));

            // Check if document has finished AI processing
            if (doc.getProcessStatus() != DocumentProcessStatus.PROCESSED) {
                throw new RuntimeException("Document is not processed yet.");
            }

            documents.add(doc);
        }

        // 5. Link new documents to session if they aren't already linked
        List<ChatSessionDocument> existingDocs = chatSessionDocumentRepository
                .findByChatSessionSessionId(chatSession.getSessionId());
        Set<Long> existingDocIds = existingDocs.stream()
                .map(d -> d.getDocument().getId())
                .collect(Collectors.toSet());

        for (Document doc : documents) {
            if (!existingDocIds.contains(doc.getId())) {
                ChatSessionDocument sessionDoc = ChatSessionDocument.builder()
                        .id(UUID.randomUUID().toString())
                        .chatSession(chatSession)
                        .document(doc)
                        .createdAt(LocalDateTime.now())
                        .build();
                chatSessionDocumentRepository.save(sessionDoc);
            }
        }

        // 6. Retrieve message history BEFORE saving the new question (so the question itself is not in history context)
        List<ChatMessage> historyMessages = chatMessageRepository
                .findByChatSessionSessionIdOrderByCreatedAtAsc(chatSession.getSessionId());
        List<PythonMessage> pythonHistory = historyMessages.stream()
                .map(m -> PythonMessage.builder()
                        .role(m.getRole().name())
                        .content(m.getContent())
                        .build())
                .collect(Collectors.toList());

        // 7. Save user message in DB
        ChatMessage userMessage = ChatMessage.builder()
                .messageId(UUID.randomUUID().toString())
                .chatSession(chatSession)
                .role(ChatMessageRole.USER)
                .content(request.getQuestion())
                .createdAt(LocalDateTime.now())
                .build();
        ChatMessage savedUserMessage = chatMessageRepository.save(userMessage);

        // 8. Call Python AI Service
        PythonChatRequest pythonRequest = PythonChatRequest.builder()
                .sessionId(chatSession.getSessionId())
                .question(request.getQuestion())
                .documentIds(documentIds)
                .history(pythonHistory)
                .build();

        String url = aiServiceBaseUrl + "/chat";
        String answer;
        List<PythonCitation> pythonCitations = new ArrayList<>();

        try {
            log.info("Sending chat request to Python service: {}", url);
            PythonChatResponse pythonResponse = restTemplate.postForObject(url, pythonRequest,
                    PythonChatResponse.class);
            if (pythonResponse != null && pythonResponse.getAnswer() != null) {
                answer = pythonResponse.getAnswer();
                if (pythonResponse.getCitations() != null) {
                    pythonCitations = pythonResponse.getCitations();
                }
            } else {
                throw new RuntimeException("Empty response body from Python AI service");
            }
        } catch (Exception e) {
            log.error("Error communicating with Python AI service at {}: {}", url, e.getMessage());
            // Fallback mock response so system remains testable without Python running
            answer = "This is a fallback mock answer because the Python AI service at " + url
                    + " is unreachable or returned an error. Question asked: \""
                    + request.getQuestion() + "\".";

            // Generate a mock citation if documentIds exist
            if (!documentIds.isEmpty()) {
                pythonCitations.add(PythonCitation.builder()
                        .documentId(documentIds.get(0))
                        .chunkIndex(0)
                        .score(0.95)
                        .previewText("This is a mock preview text generated as a fallback citation.")
                        .build());
            }
        }

        // 9. Save assistant response message in DB
        ChatMessage assistantMessage = ChatMessage.builder()
                .messageId(UUID.randomUUID().toString())
                .chatSession(chatSession)
                .role(ChatMessageRole.ASSISTANT)
                .content(answer)
                .createdAt(LocalDateTime.now())
                .build();
        ChatMessage savedAssistantMessage = chatMessageRepository.save(assistantMessage);

        // 10. Process and save citations
        List<ChatCitationResponse> citationResponses = new ArrayList<>();
        for (PythonCitation pc : pythonCitations) {
            Optional<Document> docOpt = documentRepository.findById(pc.getDocumentId());
            if (docOpt.isEmpty()) {
                log.warn("Citation doc ID {} does not exist in DB, skipping.", pc.getDocumentId());
                continue;
            }
            Document doc = docOpt.get();

            Optional<DocumentChunk> chunkOpt = documentChunkRepository
                    .findByDocument_IdAndChunkIndex(pc.getDocumentId(), pc.getChunkIndex());
            if (chunkOpt.isEmpty()) {
                log.warn("Citation chunk index {} for doc ID {} does not exist in DB, skipping.",
                        pc.getChunkIndex(), pc.getDocumentId());
                continue;
            }
            DocumentChunk chunk = chunkOpt.get();

            // Preview text resolving
            String previewText = pc.getPreviewText();
            if (previewText == null || previewText.isBlank()) {
                String chunkText = chunk.getChunkText();
                previewText = (chunkText != null && chunkText.length() > 500)
                        ? chunkText.substring(0, 500)
                        : chunkText;
            }

            AiCitation citation = AiCitation.builder()
                    .citationId(UUID.randomUUID().toString())
                    .chatSession(chatSession)
                    .aiMessage(savedAssistantMessage)
                    .documentChunk(chunk)
                    .document(doc)
                    .score(pc.getScore())
                    .chunkIndex(pc.getChunkIndex())
                    .previewText(previewText)
                    .createdAt(LocalDateTime.now())
                    .build();

            AiCitation savedCitation = aiCitationRepository.save(citation);

            citationResponses.add(ChatCitationResponse.builder()
                    .citationId(savedCitation.getCitationId())
                    .documentId(doc.getId())
                    .documentTitle(doc.getTitle())
                    .chunkId(chunk.getId())
                    .chunkIndex(savedCitation.getChunkIndex())
                    .score(savedCitation.getScore())
                    .previewText(savedCitation.getPreviewText())
                    .documentName(pc.getDocumentName())
                    .type(pc.getType())
                    .label(pc.getLabel())
                    .build());
        }

        // 11. Update session's updatedAt timestamp
        chatSession.setUpdatedAt(LocalDateTime.now());
        chatSessionRepository.save(chatSession);

        return ChatAskResponse.builder()
                .sessionId(chatSession.getSessionId())
                .userMessageId(savedUserMessage.getMessageId())
                .assistantMessageId(savedAssistantMessage.getMessageId())
                .answer(answer)
                .citations(citationResponses)
                .createdAt(savedAssistantMessage.getCreatedAt())
                .build();
    }

    // ─── Get Sessions for User ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ChatSessionResponse> getSessionsByUserId(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new RuntimeException("User not found with id: " + userId);
        }

        List<ChatSession> sessions = chatSessionRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return sessions.stream()
                .map(s -> ChatSessionResponse.builder()
                        .sessionId(s.getSessionId())
                        .userId(s.getUser().getId())
                        .title(s.getTitle())
                        .createdAt(s.getCreatedAt())
                        .updatedAt(s.getUpdatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    // ─── Get Message History ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getSessionHistory(String sessionId) {
        if (!chatSessionRepository.existsById(sessionId)) {
            throw new RuntimeException("Chat session not found with id: " + sessionId);
        }

        List<ChatMessage> messages = chatMessageRepository
                .findByChatSessionSessionIdOrderByCreatedAtAsc(sessionId);
        List<ChatMessageResponse> responses = new ArrayList<>();

        for (ChatMessage msg : messages) {
            List<ChatCitationResponse> citations = new ArrayList<>();
            if (msg.getRole() == ChatMessageRole.ASSISTANT) {
                List<AiCitation> dbCitations = aiCitationRepository
                        .findByAiMessageMessageIdOrderByScoreDesc(msg.getMessageId());
                citations = dbCitations.stream()
                        .map(c -> ChatCitationResponse.builder()
                                .citationId(c.getCitationId())
                                .documentId(c.getDocument().getId())
                                .documentTitle(c.getDocument().getTitle())
                                .chunkId(c.getDocumentChunk().getId())
                                .chunkIndex(c.getChunkIndex())
                                .score(c.getScore())
                                .previewText(c.getPreviewText())
                                .build())
                        .collect(Collectors.toList());
            }

            responses.add(ChatMessageResponse.builder()
                    .messageId(msg.getMessageId())
                    .role(msg.getRole().name())
                    .content(msg.getContent())
                    .createdAt(msg.getCreatedAt())
                    .citations(citations)
                    .build());
        }

        return responses;
    }
}
