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
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Handles Chat AI sessions, message persistence, and answer generation.
 *
 * <p>
 * <b>Two-mode flow:</b>
 * <ol>
 * <li><b>GENERAL_CHAT</b>: no documentIds → call /generate-answer directly (no
 * pgvector).</li>
 * <li><b>DOCUMENT_CHAT</b>: documentIds resolved → call /analyze-chat-query
 * (planner),
 * route retrieval, call /generate-answer with context chunks.</li>
 * </ol>
 * DocumentIds are resolved in priority order:
 * request.documentIds → session attached docs → empty (GENERAL_CHAT).
 */
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
    private final SemanticSearchService semanticSearchService;

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ai.service.base-url}")
    private String aiServiceBaseUrl;

    private static final int CHAT_TOP_K = 5;
    /** For OVERVIEW: max chars of chunk text to include per chunk. */
    private static final int OVERVIEW_CHUNK_CHAR_LIMIT = 1000;
    /** For OVERVIEW: how many ordered chunks to build context from. */
    private static final int OVERVIEW_MAX_CHUNKS = 20;

    // ─── Create Chat Session ────────────────────────────────────────────────────

    @Transactional
    public CreateChatSessionResponse createChatSession(CreateChatSessionRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException(
                        "User not found with id: " + request.getUserId()));

        String title = (request.getTitle() == null || request.getTitle().isBlank())
                ? "New Chat"
                : request.getTitle();

        LocalDateTime now = LocalDateTime.now();
        ChatSession chatSession = ChatSession.builder()
                .sessionId(UUID.randomUUID().toString())
                .user(user)
                .title(title)
                .createdAt(now)
                .updatedAt(now)
                .build();

        ChatSession savedSession = chatSessionRepository.save(chatSession);

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
        log.info("Processing askChatbot for session: {}", request.getSessionId());

        // 1. Validate User
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException(
                        "User not found with id: " + request.getUserId()));

        // 2. Validate Session & ownership
        ChatSession chatSession = chatSessionRepository.findById(request.getSessionId())
                .orElseThrow(() -> new RuntimeException(
                        "Chat session not found with id: " + request.getSessionId()));

        if (!chatSession.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("This chat session does not belong to the user.");
        }

        // 3. Resolve active documentIds (request → session → empty)
        List<Long> activeDocumentIds = resolveDocumentIds(request, chatSession);
        boolean hasDocuments = !activeDocumentIds.isEmpty();
        log.info("[Chat] resolved documentIds={} (hasDocuments={})", activeDocumentIds, hasDocuments);

        // 4. Validate documents if present
        List<Document> documents = new ArrayList<>();
        if (hasDocuments) {
            if (activeDocumentIds.size() > 5) {
                throw new RuntimeException("Cannot select more than 5 documents per question.");
            }
            for (Long docId : activeDocumentIds) {
                Document doc = documentRepository.findById(docId)
                        .orElseThrow(() -> new RuntimeException("Document not found with id: " + docId));
                if (doc.getProcessStatus() != DocumentProcessStatus.PROCESSED) {
                    throw new RuntimeException("Document " + docId + " is not processed yet.");
                }
                documents.add(doc);
            }

            // 5. Link new documents to session if not already linked
            List<ChatSessionDocument> existingDocs = chatSessionDocumentRepository
                    .findByChatSessionSessionId(chatSession.getSessionId());
            Set<Long> existingDocIds = existingDocs.stream()
                    .map(d -> d.getDocument().getId())
                    .collect(Collectors.toSet());
            for (Document doc : documents) {
                if (!existingDocIds.contains(doc.getId())) {
                    chatSessionDocumentRepository.save(
                            ChatSessionDocument.builder()
                                    .id(UUID.randomUUID().toString())
                                    .chatSession(chatSession)
                                    .document(doc)
                                    .createdAt(LocalDateTime.now())
                                    .build());
                }
            }
        }

        // 6. Build chat history (before saving current message)
        List<ChatMessage> historyMessages = chatMessageRepository
                .findByChatSessionSessionIdOrderByCreatedAtAsc(chatSession.getSessionId());
        List<PythonMessage> pythonHistory = historyMessages.stream()
                .map(m -> PythonMessage.builder()
                        .role(m.getRole().name())
                        .content(m.getContent())
                        .build())
                .collect(Collectors.toList());

        // 7. Save USER message
        ChatMessage userMessage = ChatMessage.builder()
                .messageId(UUID.randomUUID().toString())
                .chatSession(chatSession)
                .role(ChatMessageRole.USER)
                .content(request.getQuestion())
                .createdAt(LocalDateTime.now())
                .build();
        ChatMessage savedUserMessage = chatMessageRepository.save(userMessage);

        // ── 8. Route: GENERAL_CHAT vs DOCUMENT_CHAT ──────────────────────────
        String answer;
        List<PythonContextChunk> contextChunks = List.of();

        if (!hasDocuments) {
            // ── GENERAL CHAT MODE ──────────────────────────────────────────────
            log.info("[Chat] mode=GENERAL_CHAT — skipping semantic search and pgvector.");
            answer = callGenerateAnswer(
                    request.getQuestion(), null, ChatIntent.GENERAL_CHAT.name(),
                    pythonHistory, List.of(), false);

        } else {
            // ── DOCUMENT CHAT MODE ─────────────────────────────────────────────
            // Step 8a: call planner
            PythonAnalyzeChatQueryResponse plan = callAnalyzeChatQuery(
                    request.getQuestion(), pythonHistory, true, activeDocumentIds.size());
            log.info("[Chat] planner — intent={}, strategy={}, rewritten='{}', confidence={}",
                    plan.getIntent(), plan.getRetrievalStrategy(),
                    plan.getRewrittenQuestion(), plan.getConfidence());

            ChatIntent intent = safeChatIntent(plan.getIntent());
            RetrievalStrategy strategy = safeRetrievalStrategy(plan.getRetrievalStrategy());
            String effectiveQuestion = (plan.getRewrittenQuestion() != null
                    && !plan.getRewrittenQuestion().isBlank())
                            ? plan.getRewrittenQuestion()
                            : request.getQuestion();

            String retrievalQuery = (request.getQuestion() != null && !request.getQuestion().isBlank())
                    ? request.getQuestion()
                    : effectiveQuestion;

            // Step 8b: Route retrieval
            switch (intent) {
                case GENERAL_CHAT:
                case META_CHAT:
                    log.info("[Chat] intent={} → no retrieval.", intent);
                    contextChunks = List.of();
                    break;

                case DOCUMENT_OVERVIEW:
                    log.info("[Chat] intent=DOCUMENT_OVERVIEW → building overview context.");
                    contextChunks = buildOverviewContext(activeDocumentIds);
                    break;

                case COMPARISON:
                    log.info("[Chat] intent=COMPARISON → multi-hop semantic search.");
                    contextChunks = buildComparisonContext(plan.getSearchQueries(),
                            activeDocumentIds, CHAT_TOP_K);
                    break;

                case TOOL_SUMMARY:
                case TOOL_QUIZ:
                    // TODO: route to existing Summary/Quiz services in a future task.
                    log.info("[Chat] intent={} — tool routing not yet implemented; " +
                            "falling back to semantic search.", intent);
                    contextChunks = retrieveSemanticChunks(retrievalQuery, activeDocumentIds, CHAT_TOP_K);
                    break;

                default: // DOCUMENT_QA, FOLLOW_UP_QA, OUT_OF_SCOPE
                    log.info("[Chat] intent={} → semantic search. originalQuestion='{}', rewrittenQuestion='{}', retrievalQuery='{}'",
                            intent, request.getQuestion(), plan.getRewrittenQuestion(), retrievalQuery);
                    contextChunks = retrieveSemanticChunks(retrievalQuery, activeDocumentIds, CHAT_TOP_K);
                    break;
            }

            log.info("[Chat] contextChunks={} chunks resolved.", contextChunks.size());

            // Step 8c: Call /generate-answer
            answer = callGenerateAnswer(
                    request.getQuestion(), effectiveQuestion, intent.name(),
                    pythonHistory, contextChunks, true);
        }

        // 9. Save ASSISTANT message
        ChatMessage assistantMessage = ChatMessage.builder()
                .messageId(UUID.randomUUID().toString())
                .chatSession(chatSession)
                .role(ChatMessageRole.ASSISTANT)
                .content(answer)
                .createdAt(LocalDateTime.now())
                .build();
        ChatMessage savedAssistantMessage = chatMessageRepository.save(assistantMessage);

        // 10. Save citations if we have context chunks
        List<ChatCitationResponse> citationResponses = new ArrayList<>();
        if (hasDocuments) {
            citationResponses = saveCitations(contextChunks, chatSession,
                    savedAssistantMessage, aiCitationRepository);
            log.info("[Chat] saved {} citations.", citationResponses.size());
        } else {
            log.info("[Chat] GENERAL_CHAT — citations skipped.");
        }

        // 11. Update session timestamp
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

    // ─── Private helpers ────────────────────────────────────────────────────────

    /**
     * Resolve active document IDs in priority order:
     * 1. request.documentIds (if non-empty)
     * 2. session-attached documents
     * 3. empty list → GENERAL_CHAT
     */
    private List<Long> resolveDocumentIds(ChatAskRequest request, ChatSession chatSession) {
        if (request.getDocumentIds() != null && !request.getDocumentIds().isEmpty()) {
            log.info("[Chat] documentIds source=REQUEST ({})", request.getDocumentIds());
            return request.getDocumentIds();
        }
        List<ChatSessionDocument> sessionDocs = chatSessionDocumentRepository
                .findByChatSessionSessionId(chatSession.getSessionId());
        if (!sessionDocs.isEmpty()) {
            List<Long> ids = sessionDocs.stream()
                    .map(d -> d.getDocument().getId())
                    .collect(Collectors.toList());
            log.info("[Chat] documentIds source=SESSION ({})", ids);
            return ids;
        }
        log.info("[Chat] documentIds source=NONE → GENERAL_CHAT mode.");
        return List.of();
    }

    /**
     * Call Python /analyze-chat-query (Chat Planner). Returns a safe fallback on
     * error.
     */
    private PythonAnalyzeChatQueryResponse callAnalyzeChatQuery(
            String question, List<PythonMessage> history,
            boolean hasDocuments, int documentCount) {
        String url = aiServiceBaseUrl + "/analyze-chat-query";
        PythonAnalyzeChatQueryRequest req = PythonAnalyzeChatQueryRequest.builder()
                .question(question)
                .history(history)
                .hasDocuments(hasDocuments)
                .documentCount(documentCount)
                .build();
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<PythonAnalyzeChatQueryRequest> entity = new HttpEntity<>(req, headers);
            ResponseEntity<PythonAnalyzeChatQueryResponse> resp = restTemplate.postForEntity(url, entity,
                    PythonAnalyzeChatQueryResponse.class);
            if (resp.getBody() != null) {
                return resp.getBody();
            }
        } catch (Exception e) {
            log.warn("[Chat] /analyze-chat-query failed: {}. Using safe fallback.", e.getMessage());
        }
        // Safe fallback
        return PythonAnalyzeChatQueryResponse.builder()
                .intent(ChatIntent.DOCUMENT_QA.name())
                .rewrittenQuestion(question)
                .retrievalStrategy(RetrievalStrategy.SEMANTIC_SEARCH.name())
                .searchQueries(List.of(question))
                .needsRetrieval(true)
                .confidence(0.5)
                .build();
    }

    /** Call Python /generate-answer. Returns a fallback error string on failure. */
    private String callGenerateAnswer(String question, String rewrittenQuestion,
            String intent, List<PythonMessage> history,
            List<PythonContextChunk> contextChunks,
            boolean hasDocuments) {
        String url = aiServiceBaseUrl + "/generate-answer";
        PythonGenerateAnswerRequest payload = PythonGenerateAnswerRequest.builder()
                .question(question)
                .rewrittenQuestion(rewrittenQuestion)
                .intent(intent)
                .history(history)
                .contextChunks(contextChunks)
                .hasDocuments(hasDocuments)
                .build();
        try {
            log.info("[Chat] Calling Python /generate-answer — intent={}, chunks={}",
                    intent, contextChunks.size());
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<PythonGenerateAnswerRequest> entity = new HttpEntity<>(payload, headers);
            ResponseEntity<PythonGenerateAnswerResponse> resp = restTemplate.postForEntity(url, entity,
                    PythonGenerateAnswerResponse.class);
            if (resp.getBody() != null && resp.getBody().getAnswer() != null) {
                return resp.getBody().getAnswer();
            }
        } catch (Exception e) {
            log.error("[Chat] /generate-answer failed: {}", e.getMessage());
        }
        return "Lỗi kết nối đến Python AI service. Câu hỏi: \"" + question + "\"";
    }

    /** Standard semantic search for DOCUMENT_QA / FOLLOW_UP_QA. */
    private List<PythonContextChunk> retrieveSemanticChunks(
            String query, List<Long> documentIds, int topK) {
        try {
            return semanticSearchService.retrieveForChat(query, documentIds, topK);
        } catch (Exception e) {
            log.warn("[Chat] retrieveForChat failed: {}. Proceeding with empty context.", e.getMessage());
            return List.of();
        }
    }

    /**
     * Build DOCUMENT_OVERVIEW context: ordered first-N chunks from each document.
     * Each chunk is trimmed to OVERVIEW_CHUNK_CHAR_LIMIT chars.
     */
    private List<PythonContextChunk> buildOverviewContext(List<Long> documentIds) {
        List<PythonContextChunk> result = new ArrayList<>();
        for (Long docId : documentIds) {
            try {
                List<com.aistudyhub.backend.entity.DocumentChunk> chunks = documentChunkRepository
                        .findTop30ByDocumentIdOrderByChunkIndexAsc(docId);

                // Spread selection: take first 5 + spread remaining to reach
                // OVERVIEW_MAX_CHUNKS
                List<com.aistudyhub.backend.entity.DocumentChunk> selected = spreadSelect(chunks, OVERVIEW_MAX_CHUNKS);

                for (com.aistudyhub.backend.entity.DocumentChunk c : selected) {
                    String text = c.getChunkText();
                    if (text == null || text.isBlank())
                        continue;
                    if (text.length() > OVERVIEW_CHUNK_CHAR_LIMIT) {
                        text = text.substring(0, OVERVIEW_CHUNK_CHAR_LIMIT) + "...";
                    }
                    String docTitle = c.getDocument() != null ? c.getDocument().getTitle() : null;
                    result.add(PythonContextChunk.builder()
                            .documentId(docId)
                            .documentTitle(docTitle)
                            .chunkIndex(c.getChunkIndex())
                            .chunkText(text)
                            .score(0.0)
                            .sourceLabel("Overview Chunk " + c.getChunkIndex())
                            .build());
                }
            } catch (Exception e) {
                log.warn("[Chat] buildOverviewContext failed for docId={}: {}", docId, e.getMessage());
            }
        }
        return result;
    }

    /**
     * Build COMPARISON context: run each search query separately, merge,
     * deduplicate.
     */
    private List<PythonContextChunk> buildComparisonContext(
            List<String> searchQueries, List<Long> documentIds, int topK) {
        Map<String, PythonContextChunk> seen = new LinkedHashMap<>();
        List<String> queries = (searchQueries != null && !searchQueries.isEmpty())
                ? searchQueries
                : List.of();

        for (String q : queries) {
            try {
                List<PythonContextChunk> hits = semanticSearchService.retrieveForChat(q, documentIds, topK);
                for (PythonContextChunk c : hits) {
                    String key = c.getDocumentId() + "_" + c.getChunkIndex();
                    seen.putIfAbsent(key, c);
                }
            } catch (Exception e) {
                log.warn("[Chat] COMPARISON search query '{}' failed: {}", q, e.getMessage());
            }
        }

        if (seen.isEmpty()) {
            // Fallback to single semantic search
            return retrieveSemanticChunks(
                    queries.isEmpty() ? "" : queries.get(0), documentIds, topK * 2);
        }
        return new ArrayList<>(seen.values());
    }

    /** Select up to maxCount items evenly spread from a list. */
    private <T> List<T> spreadSelect(List<T> source, int maxCount) {
        if (source.size() <= maxCount)
            return source;
        List<T> result = new ArrayList<>();
        double step = (double) source.size() / maxCount;
        for (int i = 0; i < maxCount; i++) {
            result.add(source.get((int) (i * step)));
        }
        return result;
    }

    /** Parse intent string safely, fallback to DOCUMENT_QA. */
    private ChatIntent safeChatIntent(String raw) {
        if (raw == null)
            return ChatIntent.DOCUMENT_QA;
        try {
            return ChatIntent.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException e) {
            log.warn("[Chat] Unknown intent '{}', defaulting to DOCUMENT_QA.", raw);
            return ChatIntent.DOCUMENT_QA;
        }
    }

    /** Parse retrieval strategy string safely, fallback to SEMANTIC_SEARCH. */
    private RetrievalStrategy safeRetrievalStrategy(String raw) {
        if (raw == null)
            return RetrievalStrategy.SEMANTIC_SEARCH;
        try {
            return RetrievalStrategy.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException e) {
            return RetrievalStrategy.SEMANTIC_SEARCH;
        }
    }

    /** Persist citations and build response list. */
    private List<ChatCitationResponse> saveCitations(
            List<PythonContextChunk> contextChunks,
            ChatSession chatSession,
            ChatMessage savedAssistantMessage,
            AiCitationRepository aiCitationRepository) {

        List<ChatCitationResponse> citationResponses = new ArrayList<>();
        for (PythonContextChunk chunk : contextChunks) {
            if (chunk.getChunkText() == null || chunk.getChunkText().isBlank())
                continue;

            Optional<Document> docOpt = documentRepository.findById(chunk.getDocumentId());
            if (docOpt.isEmpty()) {
                log.warn("[Chat] Citation: document {} not found, skipping.", chunk.getDocumentId());
                continue;
            }
            Document doc = docOpt.get();

            Optional<DocumentChunk> chunkEntityOpt = documentChunkRepository
                    .findByDocument_IdAndChunkIndex(chunk.getDocumentId(), chunk.getChunkIndex());
            if (chunkEntityOpt.isEmpty()) {
                log.warn("[Chat] Citation: chunk (docId={}, index={}) not found, skipping.",
                        chunk.getDocumentId(), chunk.getChunkIndex());
                continue;
            }
            DocumentChunk chunkEntity = chunkEntityOpt.get();

            String previewText = chunk.getChunkText().length() > 500
                    ? chunk.getChunkText().substring(0, 500)
                    : chunk.getChunkText();

            AiCitation citation = AiCitation.builder()
                    .citationId(UUID.randomUUID().toString())
                    .chatSession(chatSession)
                    .aiMessage(savedAssistantMessage)
                    .documentChunk(chunkEntity)
                    .document(doc)
                    .score(chunk.getScore())
                    .chunkIndex(chunk.getChunkIndex())
                    .previewText(previewText)
                    .createdAt(LocalDateTime.now())
                    .build();
            AiCitation savedCitation = aiCitationRepository.save(citation);

            citationResponses.add(ChatCitationResponse.builder()
                    .citationId(savedCitation.getCitationId())
                    .documentId(doc.getId())
                    .documentTitle(doc.getTitle())
                    .chunkId(chunkEntity.getId())
                    .chunkIndex(savedCitation.getChunkIndex())
                    .score(savedCitation.getScore())
                    .previewText(savedCitation.getPreviewText())
                    .documentName(doc.getTitle())
                    .label(chunk.getSourceLabel())
                    .build());
        }
        return citationResponses;
    }

    // ─── Get Sessions for User ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ChatSessionResponse> getSessionsByUserId(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new RuntimeException("User not found with id: " + userId);
        }
        return chatSessionRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
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
                citations = aiCitationRepository
                        .findByAiMessageMessageIdOrderByScoreDesc(msg.getMessageId())
                        .stream()
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
