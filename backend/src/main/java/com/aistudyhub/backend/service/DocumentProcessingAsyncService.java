package com.aistudyhub.backend.service;

import com.aistudyhub.backend.entity.Document;
import com.aistudyhub.backend.entity.DocumentProcessStatus;
import com.aistudyhub.backend.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Dedicated Spring-managed bean for asynchronous document processing.
 *
 * <p>This class exists as a <em>separate bean</em> from {@link DocumentService}
 * so that Spring's proxy-based {@code @Async} mechanism works correctly.
 * Calling an {@code @Async} method from within the same class bypasses the proxy
 * and runs synchronously — hence the need for this dedicated service.</p>
 *
 * <h3>Lifecycle</h3>
 * <ol>
 *   <li>{@link DocumentService#uploadDocument} saves the file + metadata and
 *       sets status to {@code PROCESSING}, then fires-and-forgets
 *       {@link #processDocumentAsync}.</li>
 *   <li>This method reloads the document from MySQL (to avoid detached-entity
 *       issues), calls the existing {@link AiIntegrationService#processDocument},
 *       and lets it handle all chunk saving, status updates, and error recording.</li>
 *   <li>On success the document ends up as {@code PROCESSED}; on failure as
 *       {@code FAILED} with a meaningful {@code processErrorMessage}.</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentProcessingAsyncService {

    private final DocumentRepository documentRepository;
    private final AiIntegrationService aiIntegrationService;

    /**
     * Runs document AI processing (text extraction → chunking → embedding → vector store)
     * on a background thread.  The caller does <strong>not</strong> wait for this method
     * to return.
     *
     * @param documentId ID of the already-persisted Document record
     */
    @Async("documentProcessingExecutor")
    public void processDocumentAsync(Long documentId) {
        log.info("[ASYNC] Background processing started for document ID: {}", documentId);

        try {
            // Reload from DB to get a fresh, attached entity
            Document document = documentRepository.findById(documentId).orElse(null);
            if (document == null) {
                log.error("[ASYNC] Document ID: {} not found in database. Aborting background processing.", documentId);
                return;
            }

            var cloudFile = document.getCloudFile();
            if (cloudFile == null) {
                log.error("[ASYNC] Document ID: {} has no associated CloudFile. Aborting background processing.", documentId);
                updateStatusToFailed(documentId, "No CloudFile associated with document");
                return;
            }

            log.info("[ASYNC] Python AI service call started for document ID: {} (file: {})",
                    documentId, cloudFile.getOriginalName());

            // Delegate to the existing (unchanged) AI integration logic.
            // AiIntegrationService.processDocument already handles:
            //   - marking PROCESSING → PROCESSED / FAILED
            //   - saving chunks
            //   - updating chunkCount, processedAt, processErrorMessage
            DocumentProcessStatus result = aiIntegrationService.processDocument(
                    document.getId(),
                    cloudFile.getFileName(),
                    cloudFile.getOriginalName(),
                    cloudFile.getFileUrl(),
                    cloudFile.getFileType()
            );

            log.info("[ASYNC] Background processing finished for document ID: {}. Final status: {}",
                    documentId, result);

        } catch (Exception e) {
            log.error("[ASYNC] Unexpected exception during background processing for document ID: {}. Error: {}",
                    documentId, e.getMessage(), e);
            // Safety net: make sure status is FAILED even if something unexpected happens
            updateStatusToFailed(documentId, "Async processing exception: " + e.getMessage());
        }
    }

    /**
     * Last-resort status update in case of an unexpected exception that
     * {@link AiIntegrationService#processDocument} did not catch.
     */
    private void updateStatusToFailed(Long documentId, String errorMessage) {
        try {
            documentRepository.findById(documentId).ifPresent(doc -> {
                doc.setProcessStatus(DocumentProcessStatus.FAILED);
                doc.setProcessErrorMessage(errorMessage);
                doc.setProcessedAt(java.time.LocalDateTime.now());
                documentRepository.save(doc);
                log.warn("[ASYNC] Fallback: marked document ID: {} as FAILED. Reason: {}", documentId, errorMessage);
            });
        } catch (Exception ex) {
            log.error("[ASYNC] CRITICAL: Could not update document ID: {} to FAILED status. Error: {}",
                    documentId, ex.getMessage(), ex);
        }
    }
}
