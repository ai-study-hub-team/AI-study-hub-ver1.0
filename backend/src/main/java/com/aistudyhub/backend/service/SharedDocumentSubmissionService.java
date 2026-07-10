package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.request.SharedDocumentApproveRequest;
import com.aistudyhub.backend.dto.request.SharedDocumentRejectRequest;
import com.aistudyhub.backend.dto.response.DocumentResponse;
import com.aistudyhub.backend.dto.response.SharedDocumentSubmissionResponse;
import com.aistudyhub.backend.entity.*;
import com.aistudyhub.backend.repository.*;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SharedDocumentSubmissionService {

    private final SharedDocumentSubmissionRepository submissionRepository;
    private final DocumentShareLinkRepository shareLinkRepository;
    private final DocumentRepository documentRepository;
    private final CategoryRepository categoryRepository;
    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final DocumentProcessingAsyncService documentProcessingAsyncService;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    // ─── Public upload (User B) ────────────────────────────────────────────────

    /**
     * Handles a file submission from User B through a public share link.
     * Validates the token, saves the file to shared-submissions/, and creates
     * a SharedDocumentSubmission with status PENDING_REVIEW.
     * No Document is created; no AI processing is triggered.
     */
    @Transactional
    public SharedDocumentSubmissionResponse handlePublicUpload(
            String plainToken,
            MultipartFile file,
            String title,
            String description,
            String uploaderName,
            String uploaderEmail,
            Long uploaderUserId,
            DocumentShareLinkService shareLinkService) throws IOException {

        // 1. Validate the share link
        DocumentShareLink link = shareLinkService.findAndValidateLinkForUpload(plainToken);

        // 2. Save file to shared-submissions/ directory
        String storedFileName = fileStorageService.saveSharedSubmissionFile(file);
        String storedFilePath = fileStorageService.getSharedSubmissionFilePath(storedFileName);
        String mimeType = fileStorageService.detectMimeType(file);

        // 3. Build submission record
        LocalDateTime now = LocalDateTime.now();
        SharedDocumentSubmission submission = SharedDocumentSubmission.builder()
                .shareLink(link)
                .ownerUserId(link.getOwner().getId())
                .uploaderUserId(uploaderUserId)
                .uploaderName(uploaderName)
                .uploaderEmail(uploaderEmail)
                .originalFileName(file.getOriginalFilename())
                .storedFileName(storedFileName)
                .storedFilePath(storedFilePath)
                .fileType(mimeType)
                .fileSize(file.getSize())
                .title(title != null && !title.isBlank() ? title : file.getOriginalFilename())
                .description(description)
                .status(SharedSubmissionStatus.PENDING_REVIEW)
                .submittedAt(now)
                // 30-day retention: if still PENDING_REVIEW after this, the scheduler auto-purges
                .deleteAfter(now.plusDays(30))
                .build();

        SharedDocumentSubmission saved = submissionRepository.save(submission);

        // 4. Increment the share link's upload counter
        link.setCurrentUploads(link.getCurrentUploads() + 1);
        link.setUpdatedAt(LocalDateTime.now());
        shareLinkRepository.save(link);

        log.info("[SharedUpload] Submission id={} created for shareLinkId={}, ownerUserId={}, deleteAfter={}",
                saved.getId(), link.getId(), link.getOwner().getId(), saved.getDeleteAfter());

        return toResponse(saved);
    }

    // ─── List submissions (User A) ─────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<SharedDocumentSubmissionResponse> getSubmissionsForOwner(
            Long ownerUserId, SharedSubmissionStatus statusFilter) {
        List<SharedDocumentSubmission> list = (statusFilter != null)
                ? submissionRepository.findByOwnerUserIdAndStatusOrderBySubmittedAtDesc(
                        ownerUserId, statusFilter)
                : submissionRepository.findByOwnerUserIdOrderBySubmittedAtDesc(ownerUserId);

        return list.stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ─── Get one submission (User A) ───────────────────────────────────────────

    @Transactional(readOnly = true)
    public SharedDocumentSubmissionResponse getSubmissionForOwner(Long submissionId, Long ownerUserId) {
        SharedDocumentSubmission submission = submissionRepository
                .findByIdAndOwnerUserId(submissionId, ownerUserId)
                .orElseThrow(() -> new RuntimeException(
                        "Submission not found or does not belong to user: " + submissionId));
        return toResponse(submission);
    }

    // ─── Approve (User A) ──────────────────────────────────────────────────────

    /**
     * User A approves a pending submission.
     * Creates an official Document owned by User A, then triggers async AI processing.
     * The submission's storedFile is copied to the main uploads/ directory.
     */
    @Transactional
    public DocumentResponse approveSubmission(Long submissionId, SharedDocumentApproveRequest request)
            throws IOException {

        SharedDocumentSubmission submission = submissionRepository
                .findByIdAndOwnerUserId(submissionId, request.getUserId())
                .orElseThrow(() -> new RuntimeException(
                        "Submission not found or does not belong to user: " + submissionId));

        if (submission.getStatus() != SharedSubmissionStatus.PENDING_REVIEW) {
            throw new RuntimeException(
                    "Cannot approve a submission with status: " + submission.getStatus());
        }

        // ── Resolve User A ────────────────────────────────────────────────────
        User owner = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException(
                        "User not found with id: " + request.getUserId()));

        // ── Resolve optional Category (must belong to User A) ─────────────────
        Category category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new RuntimeException(
                            "Category not found with id: " + request.getCategoryId()));
        }

        // ── Resolve folder ────────────────────────────────────────────────────
        // Priority: approveRequest.folderId → shareLink.defaultFolderId → null (root)
        Folder folder = null;
        Long requestedFolderId = request.getFolderId();
        if (requestedFolderId == null && submission.getShareLink() != null
                && submission.getShareLink().getDefaultFolder() != null) {
            requestedFolderId = submission.getShareLink().getDefaultFolder().getId();
        }
        // Capture in final variable for use in lambda
        final Long resolvedFolderId = requestedFolderId;
        if (resolvedFolderId != null) {
            folder = folderRepository.findByIdAndUserId(resolvedFolderId, owner.getId())
                    .orElseThrow(() -> new RuntimeException(
                            "Folder not found or does not belong to user: " + resolvedFolderId));
        }

        // ── Copy file from shared-submissions/ to main uploads/ ───────────────
        String newFileName = fileStorageService.copySharedSubmissionToUploads(
                submission.getStoredFileName());
        String newFilePath = uploadDir + "/" + newFileName;

        // ── Build CloudFile record ────────────────────────────────────────────
        CloudFile cloudFile = CloudFile.builder()
                .fileName(newFileName)
                .originalName(submission.getOriginalFileName())
                .fileType(submission.getFileType())
                .fileSize(submission.getFileSize())
                .fileUrl(newFilePath)
                .storageProvider("LOCAL")
                .uploadedAt(LocalDateTime.now())
                .build();

        // ── Build official Document ───────────────────────────────────────────
        String finalTitle = (request.getTitle() != null && !request.getTitle().isBlank())
                ? request.getTitle()
                : submission.getTitle();

        String tags = buildTags(request.getDocumentType(), request.getVisibility());

        LocalDateTime now = LocalDateTime.now();
        Document document = Document.builder()
                .title(finalTitle)
                .description(request.getDescription() != null
                        ? request.getDescription() : submission.getDescription())
                .tags(tags)
                .status(DocumentStatus.ACTIVE)
                .processStatus(DocumentProcessStatus.PROCESSING)
                .user(owner)
                .category(category)
                .folder(folder)
                .cloudFile(cloudFile)
                // Provenance
                .sourceType(DocumentSourceType.SHARED_UPLOAD)
                .sourceSubmissionId(submission.getId())
                .contributedByUserId(submission.getUploaderUserId())
                .contributedByName(submission.getUploaderName())
                .contributedByEmail(submission.getUploaderEmail())
                .createdAt(now)
                .updatedAt(now)
                .build();

        Document savedDoc = documentRepository.save(document);
        log.info("[SharedUpload] Official Document id={} created from submission id={} for userId={}",
                savedDoc.getId(), submissionId, owner.getId());

        // ── Update submission ─────────────────────────────────────────────────
        submission.setStatus(SharedSubmissionStatus.APPROVED);
        submission.setApprovedDocumentId(savedDoc.getId());
        submission.setReviewedAt(now);
        submission.setReviewedBy(owner.getId());
        // Clear deleteAfter so the pending-submission cleanup scheduler never touches this record
        submission.setDeleteAfter(null);
        submissionRepository.save(submission);

        // ── Trigger async AI processing AFTER COMMIT ──────────────────────────────────
        // The async thread must not start until the current transaction commits;
        // otherwise it cannot see the new Document row in the database.
        Long savedDocId = savedDoc.getId();
        dispatchProcessingAfterCommit(savedDocId);
        log.info("[SharedUpload] Async processing scheduled after commit for document id={}", savedDocId);

        // ── Delete staging file AFTER COMMIT ─────────────────────────────────────
        // We only remove the old staged copy after the transaction successfully commits,
        // guaranteeing the official file and Document record exist first.
        // If the transaction rolls back for any reason, the staged file stays intact for retry.
        String stagedFileName = submission.getStoredFileName();
        dispatchStagingFileDeletionAfterCommit(stagedFileName, submissionId);

        return toDocumentResponse(savedDoc);
    }

    // ─── Reject (User A) ───────────────────────────────────────────────────────

    @Transactional
    public SharedDocumentSubmissionResponse rejectSubmission(
            Long submissionId, SharedDocumentRejectRequest request) {

        SharedDocumentSubmission submission = submissionRepository
                .findByIdAndOwnerUserId(submissionId, request.getUserId())
                .orElseThrow(() -> new RuntimeException(
                        "Submission not found or does not belong to user: " + submissionId));

        if (submission.getStatus() != SharedSubmissionStatus.PENDING_REVIEW) {
            throw new RuntimeException(
                    "Cannot reject a submission with status: " + submission.getStatus());
        }

        LocalDateTime now = LocalDateTime.now();
        submission.setStatus(SharedSubmissionStatus.REJECTED);
        submission.setRejectReason(request.getReason());
        submission.setReviewedAt(now);
        submission.setReviewedBy(request.getUserId());
        // Clear deleteAfter: the 30-day auto-delete policy only applies to PENDING_REVIEW.
        // Keeping a non-null deleteAfter on REJECTED submissions would mislead the frontend
        // into showing a false "will be deleted at" date, since the scheduler never targets them.
        submission.setDeleteAfter(null);
        SharedDocumentSubmission saved = submissionRepository.save(submission);

        log.info("[SharedUpload] Submission id={} rejected by userId={}", submissionId, request.getUserId());
        return toResponse(saved);
    }

    // ─── File view / download (User A) ────────────────────────────────────────

    /**
     * Carries the file {@link Resource} together with the display metadata
     * needed by the controller to build correct HTTP response headers.
     */
    @Data
    public static class SubmissionFileResult {
        private final Resource resource;
        /** Stored UUID-based file name, used as a fallback display name. */
        private final String storedFileName;
        /** Original file name as uploaded by User B (shown in Content-Disposition). */
        private final String originalFileName;
        /** MIME type detected at upload time; may be null. */
        private final String mimeType;
    }

    /**
     * Loads the raw file for a shared submission, enforcing that the caller
     * is the owner via {@code findByIdAndOwnerUserId}.
     *
     * @param submissionId the submission to retrieve
     * @param ownerUserId  the authenticated User A
     * @return a {@link SubmissionFileResult} ready for streaming
     * @throws RuntimeException (→ 404) if the submission does not belong to the user
     */
    @Transactional(readOnly = true)
    public SubmissionFileResult getSubmissionFileForOwner(Long submissionId, Long ownerUserId) {
        SharedDocumentSubmission submission = submissionRepository
                .findByIdAndOwnerUserId(submissionId, ownerUserId)
                .orElseThrow(() -> new RuntimeException(
                        "Submission not found or does not belong to user: " + submissionId));

        String storedFileName = submission.getStoredFileName();
        if (storedFileName == null || storedFileName.isBlank()) {
            throw new RuntimeException("No file attached to submission: " + submissionId);
        }

        Resource resource = fileStorageService.loadSharedSubmissionFileAsResource(storedFileName);

        // Resolve MIME type: prefer the value captured at upload time, fall back to extension
        String mimeType = (submission.getFileType() != null && !submission.getFileType().isBlank())
                ? submission.getFileType()
                : fileStorageService.getMimeTypeFromFileName(storedFileName);

        return new SubmissionFileResult(
                resource,
                storedFileName,
                submission.getOriginalFileName(),
                mimeType);
    }

    // ─── Mappers ───────────────────────────────────────────────────────────────


    public SharedDocumentSubmissionResponse toResponse(SharedDocumentSubmission s) {
        String shareLinkTitle = null;
        Long shareLinkId = null;
        if (s.getShareLink() != null) {
            shareLinkId = s.getShareLink().getId();
            shareLinkTitle = s.getShareLink().getTitle();
        }

        return SharedDocumentSubmissionResponse.builder()
                .id(s.getId())
                .shareLinkId(shareLinkId)
                .shareLinkTitle(shareLinkTitle)
                .ownerUserId(s.getOwnerUserId())
                .uploaderUserId(s.getUploaderUserId())
                .uploaderName(s.getUploaderName())
                .uploaderEmail(s.getUploaderEmail())
                .originalFileName(s.getOriginalFileName())
                .fileType(s.getFileType())
                .fileSize(s.getFileSize())
                .title(s.getTitle())
                .description(s.getDescription())
                .status(s.getStatus())
                .approvedDocumentId(s.getApprovedDocumentId())
                .submittedAt(s.getSubmittedAt())
                .reviewedAt(s.getReviewedAt())
                .reviewedBy(s.getReviewedBy())
                .rejectReason(s.getRejectReason())
                .deleteAfter(s.getDeleteAfter())   // null once approved or for rejected submissions
                .build();
    }

    // ─── Cleanup: permanently remove one expired pending submission ───────────────────────

    /**
     * Permanently cleans up one expired PENDING_REVIEW submission.
     *
     * <p>Called exclusively by {@code SharedSubmissionCleanupScheduler}.
     * Validates that the submission is still PENDING_REVIEW and its deadline has passed
     * before doing anything destructive.
     *
     * <p>Deletion order:
     * <ol>
     *   <li>Verify status is still PENDING_REVIEW (guard against concurrent approval).</li>
     *   <li>Verify deleteAfter {@code <=} now (guard against clock drift / re-queried state).</li>
     *   <li>Delete the staged file from {@code uploads/shared-submissions/}.</li>
     *   <li>Delete the submission DB record.</li>
     * </ol>
     *
     * <p>If file deletion fails, the method throws so the scheduler logs the failure
     * and the DB record is NOT deleted, allowing a retry on the next run.
     *
     * @param submission the expired submission to purge
     */
    @Transactional
    public void cleanupExpiredSubmission(SharedDocumentSubmission staleSubmission) {
        Long id = staleSubmission.getId();
        LocalDateTime now = LocalDateTime.now();

        // ── Re-load fresh state from DB ───────────────────────────────────────────────
        // The scheduler may have loaded the entity moments before User A clicked Approve.
        // We reload here so we work from the current committed DB state, not a stale snapshot.
        SharedDocumentSubmission submission = submissionRepository.findById(id).orElse(null);
        if (submission == null) {
            log.info("[SharedSubmissionCleanup] Skipping id={}: no longer exists in DB (already deleted?).", id);
            return;
        }

        // Guard 1: must still be PENDING_REVIEW
        if (submission.getStatus() != SharedSubmissionStatus.PENDING_REVIEW) {
            log.info("[SharedSubmissionCleanup] Skipping id={}: status is now {} (approved or rejected concurrently).",
                    id, submission.getStatus());
            return;
        }

        // Guard 2: deleteAfter must be non-null and have actually passed
        if (submission.getDeleteAfter() == null || submission.getDeleteAfter().isAfter(now)) {
            log.info("[SharedSubmissionCleanup] Skipping id={}: deleteAfter={} is null or not yet expired.",
                    id, submission.getDeleteAfter());
            return;
        }

        // ── All guards passed: safely delete file then DB record ───────────────────
        // If file deletion throws, the exception propagates to the scheduler which logs
        // the failure and leaves the DB record intact so the next run can retry.
        String fileName = submission.getStoredFileName();
        if (fileName != null && !fileName.isBlank()) {
            fileStorageService.deleteSharedSubmissionFile(fileName);
        }

        submissionRepository.delete(submission);
        log.info("[SharedSubmissionCleanup] Permanently deleted expired submission id={}, title='{}'",
                id, submission.getTitle());
    }

    private DocumentResponse toDocumentResponse(Document d) {
        DocumentResponse.DocumentResponseBuilder b = DocumentResponse.builder()
                .id(d.getId())
                .title(d.getTitle())
                .description(d.getDescription())
                .tags(d.getTags())
                .status(d.getStatus())
                .processStatus(d.getProcessStatus())
                .userId(d.getUser() != null ? d.getUser().getId() : null)
                .createdAt(d.getCreatedAt())
                .updatedAt(d.getUpdatedAt())
                .processedAt(d.getProcessedAt())
                .processErrorMessage(d.getProcessErrorMessage())
                .chunkCount(d.getChunkCount())
                .sourceType(d.getSourceType() != null ? d.getSourceType().name() : null)
                .sourceSubmissionId(d.getSourceSubmissionId())
                .contributedByUserId(d.getContributedByUserId())
                .contributedByName(d.getContributedByName())
                .contributedByEmail(d.getContributedByEmail());

        if (d.getCategory() != null) {
            b.categoryId(d.getCategory().getId());
            b.categoryName(d.getCategory().getName());
        }
        if (d.getFolder() != null) {
            b.folderId(d.getFolder().getId());
            b.folderName(d.getFolder().getName());
        }
        if (d.getCloudFile() != null) {
            CloudFile cf = d.getCloudFile();
            b.cloudFileId(cf.getId());
            b.fileName(cf.getFileName());
            b.originalName(cf.getOriginalName());
            b.fileUrl(cf.getFileUrl());
            b.fileType(cf.getFileType());
            b.fileSize(cf.getFileSize());
            b.storageProvider(cf.getStorageProvider());
        }
        return b.build();
    }

    private String buildTags(String documentType, String visibility) {
        StringBuilder sb = new StringBuilder();
        if (documentType != null && !documentType.isBlank()) {
            sb.append(documentType.toUpperCase());
        }
        if (visibility != null && !visibility.isBlank()) {
            if (!sb.isEmpty()) sb.append(",");
            sb.append(visibility.toUpperCase());
        }
        return sb.isEmpty() ? null : sb.toString();
    }

    // ─── After-commit async dispatch ──────────────────────────────────────────

    /**
     * Schedules {@link DocumentProcessingAsyncService#processDocumentAsync} to run
     * <em>only after</em> the current transaction commits successfully.
     *
     * <p>This prevents the race condition where the async thread starts before the
     * approve transaction is visible in the database, causing
     * "Document not found" in the background processor.
     *
     * <p>If Spring transaction synchronisation is not active (e.g. called outside
     * a transaction context in a test), the dispatch falls back to an immediate call.
     */
    private void dispatchProcessingAfterCommit(Long documentId) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    documentProcessingAsyncService.processDocumentAsync(documentId);
                    log.info("[SharedUpload] Async processing dispatched AFTER COMMIT for document id={}",
                            documentId);
                }
            });
        } else {
            documentProcessingAsyncService.processDocumentAsync(documentId);
            log.info("[SharedUpload] Async processing dispatched immediately for document id={}", documentId);
        }
    }

    /**
     * Schedules deletion of the old staged file in {@code uploads/shared-submissions/}
     * to run only after the current transaction commits successfully.
     *
     * <p>This ensures the official document file (already copied to main uploads/) and the
     * official Document DB record both exist and are committed before the staging copy is removed.
     * If the approval transaction rolls back, the staged file is untouched — the operation can
     * be retried safely.
     *
     * <p>If the staging-file deletion fails after a successful commit, only a warning is logged.
     * The official Document is NOT rolled back — it is already committed and fully valid.
     *
     * @param stagedFileName  the UUID-based file name inside {@code uploads/shared-submissions/}
     * @param submissionId    used for logging only
     */
    private void dispatchStagingFileDeletionAfterCommit(String stagedFileName, Long submissionId) {
        if (stagedFileName == null || stagedFileName.isBlank()) return;

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    try {
                        fileStorageService.deleteSharedSubmissionFile(stagedFileName);
                        log.info("[SharedUpload] Staging file '{}' deleted after commit for submission id={}",
                                stagedFileName, submissionId);
                    } catch (Exception e) {
                        // Do NOT throw here — the official Document is already committed and valid.
                        // Log clearly so ops can manually clean up if needed.
                        log.warn("[SharedUpload] Failed to delete staging file '{}' after approval of submission id={}: {}",
                                stagedFileName, submissionId, e.getMessage());
                    }
                }
            });
        } else {
            // Fallback (e.g. test context without active transaction synchronisation)
            try {
                fileStorageService.deleteSharedSubmissionFile(stagedFileName);
                log.info("[SharedUpload] Staging file '{}' deleted immediately for submission id={}",
                        stagedFileName, submissionId);
            } catch (Exception e) {
                log.warn("[SharedUpload] Failed to delete staging file '{}' for submission id={}: {}",
                        stagedFileName, submissionId, e.getMessage());
            }
        }
    }
}
