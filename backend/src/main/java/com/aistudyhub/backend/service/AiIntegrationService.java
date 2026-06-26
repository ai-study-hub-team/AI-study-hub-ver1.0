package com.aistudyhub.backend.service;

import com.aistudyhub.backend.entity.DocumentChunk;
import com.aistudyhub.backend.entity.DocumentProcessStatus;
import com.aistudyhub.backend.repository.DocumentChunkRepository;
import com.aistudyhub.backend.repository.DocumentRepository;
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

import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiIntegrationService {

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ai.service.base-url}")
    private String aiServiceBaseUrl;

    // ─── Main entry point ─────────────────────────────────────────────────────

    public DocumentProcessStatus processDocument(
            Long documentId, String fileName, String originalFileName,
            String filePath, String fileType) {

        log.info("Starting processing for document ID: {}", documentId);

        try {
            // Mark as PROCESSING; clear any old error message
            updateDocumentMetadata(documentId, DocumentProcessStatus.PROCESSING, null, null);

            String absoluteFilePath = Paths.get(filePath).toAbsolutePath().toString();
            log.info("Stored file path: {} | Absolute path sent to AI: {}", filePath, absoluteFilePath);

            String url = aiServiceBaseUrl + "/process-document";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Long userId = null;
            var docOpt = documentRepository.findById(documentId);
            if (docOpt.isPresent() && docOpt.get().getUser() != null) {
                userId = docOpt.get().getUser().getId();
            }

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("documentId", documentId);
            requestBody.put("fileName", fileName);
            requestBody.put("originalFileName", originalFileName);
            requestBody.put("filePath", absoluteFilePath);
            requestBody.put("fileType", fileType);
            requestBody.put("userId", userId);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

            log.info("AI service HTTP status: {}", response.getStatusCode());
            log.info("AI service response body: {}", response.getBody());

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                String status = (String) body.get("status");
                log.info("Parsed 'status' from AI response: {}", status);

                if ("PROCESSED".equals(status)) {
                    log.info("Python returned PROCESSED for document ID: {}", documentId);
                    log.info("Text length: {} | Preview: {}", body.get("textLength"), body.get("previewText"));

                    int savedChunkCount = 0;
                    try {
                        if (body.containsKey("chunks")) {
                            @SuppressWarnings("unchecked")
                            List<Map<String, Object>> chunksList =
                                    (List<Map<String, Object>>) body.get("chunks");
                            log.info("Chunks received from Python: {}",
                                    chunksList != null ? chunksList.size() : "null");
                            if (chunksList != null && !chunksList.isEmpty()) {
                                saveChunks(documentId, chunksList);
                                savedChunkCount = chunksList.size();
                            } else {
                                log.warn("Chunks list is empty or null — nothing saved.");
                            }
                        } else {
                            log.warn("Response body has no 'chunks' key!");
                        }
                    } catch (Exception e) {
                        String errMsg = "DB error while saving chunks: " + e.getMessage();
                        log.error("CRITICAL: {} for document ID: {}", errMsg, documentId, e);
                        updateDocumentMetadata(documentId, DocumentProcessStatus.FAILED, errMsg, null);
                        return DocumentProcessStatus.FAILED;
                    }

                    log.info("Finalizing document ID: {} → PROCESSED, chunkCount={}", documentId, savedChunkCount);
                    updateDocumentMetadata(documentId, DocumentProcessStatus.PROCESSED, null, savedChunkCount);
                    return DocumentProcessStatus.PROCESSED;

                } else {
                    String errMsg = "Python returned status=" + status
                            + ", message=" + body.get("message");
                    log.error("Processing failed for document ID: {}. {}", documentId, errMsg);
                    updateDocumentMetadata(documentId, DocumentProcessStatus.FAILED, errMsg, null);
                    return DocumentProcessStatus.FAILED;
                }

            } else {
                String errMsg = "AI service returned non-2xx or empty body. HTTP status: "
                        + response.getStatusCode();
                log.error("{} for document ID: {}", errMsg, documentId);
                updateDocumentMetadata(documentId, DocumentProcessStatus.FAILED, errMsg, null);
                return DocumentProcessStatus.FAILED;
            }

        } catch (Exception e) {
            String errMsg = e.getClass().getSimpleName() + ": " + e.getMessage();
            log.error("Exception while processing document ID: {}. {}", documentId, errMsg, e);
            updateDocumentMetadata(documentId, DocumentProcessStatus.FAILED, errMsg, null);
            return DocumentProcessStatus.FAILED;
        }
    }

    // ─── Update metadata helper ────────────────────────────────────────────────

    private void updateDocumentMetadata(Long documentId, DocumentProcessStatus status,
                                        String errorMessage, Integer chunkCount) {
        documentRepository.findById(documentId).ifPresent(doc -> {
            doc.setProcessStatus(status);
            // Only stamp processedAt for terminal states (not for PROCESSING)
            if (status != DocumentProcessStatus.PROCESSING) {
                doc.setProcessedAt(LocalDateTime.now());
            }
            doc.setProcessErrorMessage(errorMessage);
            if (chunkCount != null) {
                doc.setChunkCount(chunkCount);
            }
            documentRepository.save(doc);
            log.info("Document ID: {} → status={}, chunkCount={}, error={}",
                    documentId, status, doc.getChunkCount(), errorMessage);
        });
    }

    // ─── Save chunks (atomic: delete old → insert new) ────────────────────────

    @Transactional
    protected void saveChunks(Long documentId, List<Map<String, Object>> chunksData) {
        documentRepository.findById(documentId).ifPresent(document -> {
            documentChunkRepository.deleteByDocumentId(documentId);

            for (Map<String, Object> chunkData : chunksData) {
                DocumentChunk chunk = DocumentChunk.builder()
                        .document(document)
                        .chunkIndex((Integer) chunkData.get("chunkIndex"))
                        .chunkText((String) chunkData.get("chunkText"))
                        .charStart((Integer) chunkData.get("charStart"))
                        .charEnd((Integer) chunkData.get("charEnd"))
                        .textLength((Integer) chunkData.get("textLength"))
                        .build();
                documentChunkRepository.save(chunk);
            }
            log.info("Saved {} chunks to DB for document ID: {}", chunksData.size(), documentId);
        });
    }
}
