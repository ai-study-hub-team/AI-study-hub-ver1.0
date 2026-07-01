package com.aistudyhub.backend.service;

import com.aistudyhub.backend.entity.Document;
import com.aistudyhub.backend.entity.DocumentProcessStatus;
import com.aistudyhub.backend.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

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
 *   <li>{@link DocumentService#uploadDocument} (or the shared-upload approve flow) saves
 *       the file + metadata and sets {@code processStatus = PROCESSING}, then registers
 *       {@link #processDocumentAsync} to fire after the transaction commits.</li>
 *   <li>This method reloads the document from the database (fresh attached entity),
 *       calls {@link AiIntegrationService#processDocument}, and lets it handle all
 *       chunk saving, status updates (PROCESSED / FAILED), and error recording.</li>
 *   <li>If any unexpected exception escapes, {@link #markDocumentFailed} is called as
 *       a last-resort safety net so the document never stays stuck in PROCESSING.</li>
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
     * on a background thread. The caller does <strong>not</strong> wait for this method
     * to return.
     *
     * <p>The method is deliberately <em>not</em> {@code @Transactional} so that each
     * database save (reload → AI call → status update) gets its own short transaction
     * rather than holding a connection open for the full AI round-trip.
     *
     * @param documentId ID of the already-persisted Document record
     */
    @Async("documentProcessingExecutor")
    public void processDocumentAsync(Long documentId) {
        log.info("[ASYNC] Background processing started for document ID: {}", documentId);

        try {
            // Reload from DB to get a fresh, attached entity.
            // NOTE: In the shared-upload approval flow this call happens AFTER the approve
            // transaction commits (via TransactionSynchronizationManager.afterCommit),
            // so the row is guaranteed to be visible here.
            Document document = documentRepository.findById(documentId).orElse(null);

            if (document == null) {
                log.error("[ASYNC] Document ID: {} not found in database. " +
                        "This should not happen after the after-commit dispatch fix. " +
                        "Attempting defensive FAILED mark.", documentId);
                // Row truly not present — nothing to update; log and exit safely.
                markDocumentFailed(documentId,
                        "Document row not found when async processing started.");
                return;
            }

            var cloudFile = document.getCloudFile();
            if (cloudFile == null) {
                log.error("[ASYNC] Document ID: {} has no associated CloudFile. " +
                        "Aborting background processing.", documentId);
                markDocumentFailed(documentId, "No CloudFile associated with document.");
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
            String errorMsg = (e.getMessage() != null)
                    ? e.getMessage()
                    : e.getClass().getSimpleName();
            log.error("[ASYNC] Unexpected exception during background processing for document ID: {}. Error: {}",
                    documentId, errorMsg, e);
            // Safety net: AiIntegrationService handles PROCESSED/FAILED internally, but if
            // an exception escapes before or after that call, we must not leave the document
            // stuck in PROCESSING.
            markDocumentFailed(documentId, "Async processing exception: " + errorMsg);
        }
    }

    // ─── Defensive helpers ─────────────────────────────────────────────────────

    /**
     * Attempts to move a document to {@code FAILED} status with a descriptive error message.
     *
     * <p>Uses {@code ifPresentOrElse} so:
     * <ul>
     *   <li>If the row exists → update and save.</li>
     *   <li>If the row does not exist → log clearly without throwing.</li>
     * </ul>
     * The outer try/catch ensures this helper itself never crashes the async thread.
     *
     * @param documentId   ID of the document to mark as FAILED
     * @param errorMessage human-readable reason stored in {@code processErrorMessage}
     */
    private void markDocumentFailed(Long documentId, String errorMessage) {
        try {
            documentRepository.findById(documentId).ifPresentOrElse(
                    doc -> {
                        doc.setProcessStatus(DocumentProcessStatus.FAILED);
                        doc.setProcessErrorMessage(errorMessage);
                        doc.setProcessedAt(LocalDateTime.now());
                        doc.setUpdatedAt(LocalDateTime.now());
                        documentRepository.save(doc);
                        log.warn("[ASYNC] Document ID: {} marked as FAILED. Reason: {}",
                                documentId, errorMessage);
                    },
                    () -> log.error("[ASYNC] Cannot mark document ID: {} as FAILED " +
                                    "because the row does not exist in the database.",
                            documentId)
            );
        } catch (Exception updateError) {
            log.error("[ASYNC] CRITICAL: Could not update document ID: {} to FAILED status. Error: {}",
                    documentId, updateError.getMessage(), updateError);
        }
    }
}
