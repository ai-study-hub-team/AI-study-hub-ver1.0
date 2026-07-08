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
    private final PgvectorSearchService pgvectorSearchService;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ai.service.base-url}")
    private String aiServiceBaseUrl;

    /**
     * Active vector store backend. Matches the {@code vector.store} property.
     * Defaults to "pgvector" to align with the current migration state.
     */
    @Value("${vector.store:pgvector}")
    private String vectorStore;

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


            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("documentId", documentId);
            requestBody.put("fileName", fileName);
            requestBody.put("originalFileName", originalFileName);
            requestBody.put("filePath", absoluteFilePath);
            requestBody.put("fileType", fileType);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

            log.info("AI service HTTP status: {}", response.getStatusCode());

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                String status = (String) body.get("status");
                log.info("Parsed 'status' from AI response: {}", status);

                if ("PROCESSED".equals(status)) {
                    log.info("Python returned PROCESSED for document ID: {}", documentId);
                    log.info(
                            "AI extraction summary for document ID {}: textLength={}, chunkCount={}",
                            documentId,
                            body.get("textLength"),
                            body.get("chunkCount")
                    );

                    // Log vector storage result from Python (informational)
                    Boolean vectorStored = (Boolean) body.get("vectorStored");
                    Object vectorCount  = body.get("vectorCount");
                    Object vectorError  = body.get("vectorError");
                    log.info("Python vector storage — stored={}, count={}, error={}",
                            vectorStored, vectorCount, vectorError);

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

                    // --- Add Verification ---
                    if ("pgvector".equalsIgnoreCase(vectorStore)) {
                        long embeddingCount = pgvectorSearchService.countEmbeddingsByDocumentId(documentId);
                        if (savedChunkCount <= 0) {
                             String errMsg = "No chunks were saved from extraction.";
                             updateDocumentMetadata(documentId, DocumentProcessStatus.FAILED, errMsg, null);
                             return DocumentProcessStatus.FAILED;
                        }
                        if (embeddingCount != savedChunkCount) {
                             String errMsg = "Embedding count mismatch: expected " + savedChunkCount + " embeddings but found " + embeddingCount + " in pgvector.";
                             updateDocumentMetadata(documentId, DocumentProcessStatus.FAILED, errMsg, null);
                             return DocumentProcessStatus.FAILED;
                        }
                        log.info("Verified pgvector embedding count: {} (matches chunk count)", embeddingCount);
                    }
                    // -------------------------

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

    /**
     * Atomically replaces all chunks for the given document.
     *
     * <p>Steps performed inside a single transaction:
     * <ol>
     *   <li>Delete old rows from {@code document_chunks} for this document.</li>
     *   <li>If {@code vector.store=pgvector}, defensively delete stale rows from
     *       {@code document_chunk_embeddings} via {@link PgvectorSearchService}.
     *       This is a safety net — the Python AI service already deletes before
     *       upserting, but doing it here from Spring ensures no stale embeddings
     *       survive if chunk counts differ between runs.</li>
     *   <li>Insert the new chunks.</li>
     * </ol>
     *
     * <p><strong>Note:</strong> This method must be {@code public} for Spring's
     * proxy-based {@code @Transactional} to work correctly. A {@code protected}
     * or package-private method is NOT intercepted by the proxy.</p>
     *
     * @param documentId  the document being reprocessed
     * @param chunksData  list of chunk maps as returned by the Python AI service
     */
    @Transactional
    public void saveChunks(Long documentId, List<Map<String, Object>> chunksData) {
        documentRepository.findById(documentId).ifPresent(document -> {

            // Step 1: Delete old document_chunks from the relational DB
            documentChunkRepository.deleteByDocumentId(documentId);
            log.info("Deleted old document_chunks for document ID: {}", documentId);

            // Step 2: (Removed) We no longer delete pgvector embeddings here because Python
            // already does it before upserting. Deleting here would wipe the newly saved embeddings.

            // Step 3: Insert new chunks
            int chunkLogCount = 0;
            for (Map<String, Object> chunkData : chunksData) {
                Integer locatorStart = (chunkData.get("locatorStart") instanceof Integer)
                        ? (Integer) chunkData.get("locatorStart") : null;
                Integer locatorEnd = (chunkData.get("locatorEnd") instanceof Integer)
                        ? (Integer) chunkData.get("locatorEnd") : null;
                String locatorType = (chunkData.get("locatorType") instanceof String)
                        ? (String) chunkData.get("locatorType") : null;

                DocumentChunk chunk = DocumentChunk.builder()
                        .document(document)
                        .chunkIndex((Integer) chunkData.get("chunkIndex"))
                        .chunkText((String) chunkData.get("chunkText"))
                        .charStart((Integer) chunkData.get("charStart"))
                        .charEnd((Integer) chunkData.get("charEnd"))
                        .textLength((Integer) chunkData.get("textLength"))
                        .locatorType(locatorType)
                        .locatorStart(locatorStart)
                        .locatorEnd(locatorEnd)
                        .build();
                documentChunkRepository.save(chunk);

                // Log locator metadata for the first 5 chunks
                if (chunkLogCount < 5) {
                    log.info("[ChunkMetadata] docId={}, chunkIndex={}, locatorType={}, locatorStart={}, locatorEnd={}",
                            documentId, chunk.getChunkIndex(), locatorType, locatorStart, locatorEnd);
                    chunkLogCount++;
                }
            }
            log.info("Saved {} chunks to DB for document ID: {}", chunksData.size(), documentId);
        });
    }
}
