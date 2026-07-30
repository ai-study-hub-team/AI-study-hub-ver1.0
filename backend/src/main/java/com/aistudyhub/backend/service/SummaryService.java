package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.python.PythonSummaryChunk;
import com.aistudyhub.backend.dto.python.PythonSummaryRequest;
import com.aistudyhub.backend.dto.python.PythonSummaryResponse;
import com.aistudyhub.backend.dto.request.SummaryGenerateRequest;
import com.aistudyhub.backend.dto.response.SummaryGenerateResponse;
import com.aistudyhub.backend.entity.Document;
import com.aistudyhub.backend.entity.DocumentChunk;
import com.aistudyhub.backend.entity.DocumentProcessStatus;
import com.aistudyhub.backend.entity.DocumentSummary;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.enums.SummaryType;
import com.aistudyhub.backend.exception.NotFoundException;
import com.aistudyhub.backend.repository.DocumentChunkRepository;
import com.aistudyhub.backend.repository.DocumentRepository;
import com.aistudyhub.backend.repository.DocumentSummaryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SummaryService {

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentSummaryRepository documentSummaryRepository;
    private final TokenUsageService tokenUsageService;
    private final TokenPricingService tokenPricingService;
    private final CurrentUserService currentUserService;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ai.service.base-url}")
    private String aiServiceBaseUrl;

    @Transactional
    public SummaryGenerateResponse generateSummary(SummaryGenerateRequest request) {
        User user = currentUserService.getCurrentUser();
        log.info("Generating summary for documentId: {}, userId: {}", request.getDocumentId(), user.getId());

        // 1. Validate Document
        Document document = documentRepository.findById(request.getDocumentId())
                .orElseThrow(() -> new NotFoundException(
                        "Document not found with id: " + request.getDocumentId()));

        // 2. Verify ownership against the authenticated JWT user.
        if (!document.getUser().getId().equals(user.getId())) {
            throw new NotFoundException("Document not found with id: " + request.getDocumentId());
        }

        // 4. Verify Document Status
        if (document.getProcessStatus() != DocumentProcessStatus.PROCESSED) {
            throw new RuntimeException("Document has not been successfully processed yet. Current status: " + document.getProcessStatus());
        }

        // 5. Fetch chunks
        List<DocumentChunk> chunks = documentChunkRepository.findByDocument_IdOrderByChunkIndexAsc(document.getId());
        if (chunks.isEmpty()) {
            throw new RuntimeException("Document has no chunks available for summarization");
        }

        // 6. Map chunks and calculate stats
        int totalTextLength = 0;
        List<PythonSummaryChunk> pythonChunks = chunks.stream().map(chunk -> {
            PythonSummaryChunk pyChunk = PythonSummaryChunk.builder()
                    .chunkIndex(chunk.getChunkIndex())
                    .chunkText(chunk.getChunkText())
                    .textLength(chunk.getTextLength())
                    .build();
            return pyChunk;
        }).collect(Collectors.toList());

        for (DocumentChunk c : chunks) {
            totalTextLength += c.getTextLength() != null ? c.getTextLength() : 0;
        }

        // 7. Determine SummaryType
        SummaryType type = request.getSummaryType() != null ? request.getSummaryType() : SummaryType.DETAILED;

        // 8. Validate Token Quota before calling AI
        tokenUsageService.validateTokenQuota(user.getId(), "SUMMARY");

        // 9. Call Python API
        PythonSummaryRequest pythonRequest = PythonSummaryRequest.builder()
                .documentId(document.getId())
                .documentTitle(document.getTitle())
                .summaryType(type)
                .totalChunks(chunks.size())
                .totalTextLength(totalTextLength)
                .chunks(pythonChunks)
                .build();

        String url = aiServiceBaseUrl + "/summary";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<PythonSummaryRequest> entity = new HttpEntity<>(pythonRequest, headers);

        PythonSummaryResponse pythonResponse;
        try {
            ResponseEntity<PythonSummaryResponse> responseEntity = restTemplate.postForEntity(url, entity, PythonSummaryResponse.class);
            if (!responseEntity.getStatusCode().is2xxSuccessful() || responseEntity.getBody() == null) {
                throw new RuntimeException("AI service returned an invalid response");
            }
            pythonResponse = responseEntity.getBody();
        } catch (Exception e) {
            log.error("Failed to call AI service for summary: ", e);
            throw new RuntimeException("Failed to generate summary from AI service: " + e.getMessage());
        }

        if (pythonResponse.getSummaryText() == null || pythonResponse.getSummaryText().isEmpty()) {
            throw new RuntimeException("AI service returned empty summary text");
        }

        if (pythonResponse.getUsage() != null) {
            tokenUsageService.recordUsage(
                    user, 
                    "SUMMARY", 
                    tokenPricingService.getActiveModelNameForUsage(),
                    pythonResponse.getUsage().getPromptTokens(),
                    pythonResponse.getUsage().getCompletionTokens(),
                    pythonResponse.getUsage().getTotalTokens(), 
                    document.getId(), 
                    java.util.UUID.randomUUID().toString()
            );
        }

        // 10. Save to Database
        DocumentSummary documentSummary = DocumentSummary.builder()
                .document(document)
                .user(user)
                .summaryType(type)
                .summaryText(pythonResponse.getSummaryText())
                .totalChunks(chunks.size())
                .totalTextLength(totalTextLength)
                .build();

        documentSummary = documentSummaryRepository.save(documentSummary);

        // 10. Return response
        return mapToResponse(documentSummary);
    }

    @Transactional(readOnly = true)
    public List<SummaryGenerateResponse> getCurrentUserSummaries() {
        User currentUser = currentUserService.getCurrentUser();
        List<DocumentSummary> summaries = documentSummaryRepository
                .findByUser_IdOrderByCreatedAtDesc(currentUser.getId());
        return summaries.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SummaryGenerateResponse> getSummariesByDocumentId(Long documentId) {
        User currentUser = currentUserService.getCurrentUser();
        // Validate Document Ownership
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new NotFoundException("Document not found with id: " + documentId));

        if (!document.getUser().getId().equals(currentUser.getId())) {
            throw new NotFoundException("Document not found with id: " + documentId);
        }

        List<DocumentSummary> summaries = documentSummaryRepository.findByDocument_IdOrderByCreatedAtDesc(documentId);
        return summaries.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    private SummaryGenerateResponse mapToResponse(DocumentSummary summary) {
        return SummaryGenerateResponse.builder()
                .summaryId(summary.getId())
                .documentId(summary.getDocument().getId())
                .documentTitle(summary.getDocument().getTitle())
                .summaryType(summary.getSummaryType())
                .summaryText(summary.getSummaryText())
                .totalChunks(summary.getTotalChunks())
                .totalTextLength(summary.getTotalTextLength())
                .createdAt(summary.getCreatedAt())
                .build();
    }
}
