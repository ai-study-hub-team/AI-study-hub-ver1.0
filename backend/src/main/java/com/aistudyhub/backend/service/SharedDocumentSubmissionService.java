package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.request.SharedDocumentApproveRequest;
import com.aistudyhub.backend.dto.request.SharedDocumentRejectRequest;
import com.aistudyhub.backend.dto.response.DocumentResponse;
import com.aistudyhub.backend.dto.response.SharedDocumentSubmissionResponse;
import com.aistudyhub.backend.entity.*;
import com.aistudyhub.backend.exception.FileTooLargeException;
import com.aistudyhub.backend.exception.ForbiddenException;
import com.aistudyhub.backend.exception.NotFoundException;
import com.aistudyhub.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Handles the authenticated shared-upload workflow.
 *
 * <h3>Upload sequence</h3>
 * <ol>
 *   <li>Validate link (status, expiry, per-link limits)
 *   <li>Enforce access policy (PRIVATE_ALLOWLIST / ANY_AUTHENTICATED_USER)
 *   <li>Validate file-type, file-size against plan + link limits
 *   <li><strong>Atomically reserve quota</strong> from the share-link owner
 *   <li>Upload file directly to Cloudinary
 *   <li>Persist PENDING_REVIEW submission with cloud identifiers
 *   <li>If DB commit fails, delete the cloud object and restore quota
 * </ol>
 *
 * <h3>Quota accounting invariants</h3>
 * <ul>
 *   <li>Quota is charged to the <em>owner</em> (not the uploader) at upload time.
 *   <li>Approval: quota unchanged; Cloudinary object becomes the official Document.
 *   <li>Rejection/expiration: delete cloud object first, then release quota.
 *   <li>{@code quotaReleasedAt} is the idempotency guard — quota is never released twice.
 * </ul>
 */
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
    private final CloudinaryStorageService cloudinaryStorageService;
    private final DocumentProcessingAsyncService documentProcessingAsyncService;
    private final StorageQuotaService storageQuotaService;
    private final ShareLinkAccessPolicyService accessPolicyService;
    private final FileStorageService fileStorageService; // kept for MIME detection only

    // ─── Authenticated upload ──────────────────────────────────────────────────

    /**
     * Handles an authenticated upload through a share link.
     * Files are uploaded directly to Cloudinary — no local staging.
     *
     * @param plainToken     raw token from the URL
     * @param file           the uploaded file
     * @param title          optional title (defaults to original filename)
     * @param description    optional description
     * @param uploader       authenticated user from JWT
     * @param shareLinkService injected to avoid circular dependency
     */
    @Transactional
    public SharedDocumentSubmissionResponse handleAuthenticatedUpload(
            String plainToken,
            MultipartFile file,
            String title,
            String description,
            User uploader,
            DocumentShareLinkService shareLinkService) {

        // Step 1: validate link
        DocumentShareLink link = shareLinkService.findAndValidateLinkForUpload(plainToken);
        Long ownerId = link.getOwner().getId();

        // Step 2: access policy check
        accessPolicyService.assertCanUpload(link, uploader);

        // Step 3: per-user upload limit
        if (link.getMaxUploadsPerUser() != null) {
            long uploaderCount = submissionRepository.countByShareLinkIdAndUploaderUserId(
                    link.getId(), uploader.getId());
            if (uploaderCount >= link.getMaxUploadsPerUser()) {
                throw new ForbiddenException(
                        "You have reached the maximum number of uploads allowed for this link.");
            }
        }

        // Step 4: detect MIME and validate
        String mimeType = fileStorageService.detectMimeType(file);
        storageQuotaService.validateFileRestrictions(ownerId, mimeType);
        validateAllowedFileTypes(link, mimeType);

        // Step 5: size checks
        long fileSize = file.getSize();
        long effectiveSizeLimit = (link.getMaxFileSizeBytes() != null)
                ? link.getMaxFileSizeBytes()
                : storageQuotaService.getPlanFileSizeLimitBytes(ownerId);

        if (fileSize > effectiveSizeLimit) {
            throw new FileTooLargeException(
                    "File exceeds the maximum allowed size of "
                            + (effectiveSizeLimit / 1024 / 1024) + " MB for this link.");
        }

        if (link.getMaxTotalBytes() != null
                && (link.getActiveStoredBytes() + fileSize) > link.getMaxTotalBytes()) {
            throw new FileTooLargeException("This share link has reached its total storage limit.");
        }

        // Step 6: atomic quota reservation — before any external I/O
        storageQuotaService.reserveStorageForSharedUpload(ownerId, fileSize);

        // Step 7: upload directly to Cloudinary — compensate quota on failure
        CloudinaryStorageService.UploadResult uploadResult;
        try {
            uploadResult = cloudinaryStorageService.upload(file);
        } catch (Exception e) {
            log.error("[SharedUpload] Cloudinary upload failed for ownerId={}; releasing {} bytes. Error: {}",
                    ownerId, fileSize, e.getMessage());
            storageQuotaService.releaseStorageForSubmission(ownerId, fileSize);
            throw new RuntimeException("Cloud upload failed: " + e.getMessage(), e);
        }

        // Step 8: persist submission — if commit fails, delete cloud object and release quota
        String cloudPublicId = uploadResult.getPublicId();
        String cloudResourceType = uploadResult.getResourceType();
        LocalDateTime now = LocalDateTime.now();

        SharedDocumentSubmission submission = SharedDocumentSubmission.builder()
                .shareLink(link)
                .ownerUserId(ownerId)
                .quotaOwnerId(ownerId)
                .uploaderUserId(uploader.getId())
                .uploaderNameSnapshot(uploader.getFullName())
                .uploaderEmailSnapshot(uploader.getEmail())
                .originalFileName(file.getOriginalFilename())
                .cloudPublicId(cloudPublicId)
                .cloudSecureUrl(uploadResult.getSecureUrl())
                .cloudResourceType(cloudResourceType)
                .fileType(mimeType)
                .fileSize(fileSize)
                .title(title != null && !title.isBlank() ? title : file.getOriginalFilename())
                .description(description)
                .status(SharedSubmissionStatus.PENDING_REVIEW)
                .submittedAt(now)
                .deleteAfter(now.plusDays(30))
                .cloudDeleteAttempts(0)
                .build();

        // Register rollback hook: if DB commit fails, delete the cloud object immediately
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            final String finalPublicId = cloudPublicId;
            final String finalResourceType = cloudResourceType;
            final long finalFileSize = fileSize;
            final long finalOwnerId = ownerId;
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status == STATUS_ROLLED_BACK) {
                        log.warn("[SharedUpload] Transaction rolled back — deleting orphan cloud object: {}", finalPublicId);
                        try {
                            cloudinaryStorageService.delete(finalPublicId, finalResourceType);
                        } catch (Exception ex) {
                            // Log for manual cleanup; quota will also need manual correction
                            log.error("[SharedUpload] CRITICAL: cloud object {} could not be deleted after rollback. " +
                                      "Manual deletion required. Owner quota may be inflated by {} bytes.",
                                      finalPublicId, finalFileSize, ex);
                        }
                        // Release quota reservation (best-effort; subtract unconditionally)
                        try {
                            storageQuotaService.releaseStorageForSubmission(finalOwnerId, finalFileSize);
                        } catch (Exception ex) {
                            log.error("[SharedUpload] CRITICAL: quota release failed after rollback for ownerId={}. " +
                                      "Manual correction required.", finalOwnerId, ex);
                        }
                    }
                }
            });
        }

        SharedDocumentSubmission saved = submissionRepository.save(submission);

        // Update link counters
        link.setCurrentUploads(link.getCurrentUploads() + 1);
        link.setActiveStoredBytes(link.getActiveStoredBytes() + fileSize);
        link.setUpdatedAt(now);
        shareLinkRepository.save(link);

        log.info("[SharedUpload] Submission id={} created for linkId={} uploaderUserId={} ownerId={} size={}B cloudId={}",
                saved.getId(), link.getId(), uploader.getId(), ownerId, fileSize, cloudPublicId);

        return toResponse(saved);
    }

    // ─── Approve ──────────────────────────────────────────────────────────────

    /**
     * Approves a pending submission.
     *
     * <p>The file already exists in Cloudinary. This method creates the official Document
     * referencing the existing cloud object. No re-upload occurs. No quota is added.
     */
    @Transactional
    public DocumentResponse approveSubmission(Long submissionId, SharedDocumentApproveRequest request,
                                              User reviewer) {
        SharedDocumentSubmission submission = submissionRepository
                .findByIdAndOwnerUserId(submissionId, reviewer.getId())
                .orElseThrow(() -> new NotFoundException(
                        "Submission not found or does not belong to you: " + submissionId));

        if (submission.getStatus() != SharedSubmissionStatus.PENDING_REVIEW) {
            throw new RuntimeException("Cannot approve a submission with status: " + submission.getStatus());
        }
        if (submission.getCloudPublicId() == null || submission.getCloudPublicId().isBlank()) {
            throw new RuntimeException("Submission " + submissionId + " has no cloud object. Cannot approve.");
        }

        // Resolve category
        Category category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new NotFoundException("Category not found: " + request.getCategoryId()));
        }

        // Resolve folder
        Folder folder = null;
        Long resolvedFolderId = request.getFolderId();
        if (resolvedFolderId == null && submission.getShareLink() != null
                && submission.getShareLink().getDefaultFolder() != null) {
            resolvedFolderId = submission.getShareLink().getDefaultFolder().getId();
        }
        if (resolvedFolderId != null) {
            final Long fid = resolvedFolderId;
            folder = folderRepository.findByIdAndUserId(fid, reviewer.getId())
                    .orElseThrow(() -> new NotFoundException("Folder not found: " + fid));
        }

        // Build CloudFile from the EXISTING Cloudinary object — no re-upload
        CloudFile cloudFile = CloudFile.builder()
                .fileName(submission.getCloudPublicId())
                .originalName(submission.getOriginalFileName())
                .fileType(submission.getFileType())
                .fileSize(submission.getFileSize())
                .fileUrl(submission.getCloudSecureUrl())
                .storageProvider("CLOUDINARY")
                .uploadedAt(LocalDateTime.now())
                .build();

        String finalTitle = (request.getTitle() != null && !request.getTitle().isBlank())
                ? request.getTitle() : submission.getTitle();
        String tags = buildTags(request.getDocumentType(), request.getVisibility());
        LocalDateTime now = LocalDateTime.now();

        Document document = Document.builder()
                .title(finalTitle)
                .description(request.getDescription() != null
                        ? request.getDescription() : submission.getDescription())
                .tags(tags)
                .status(DocumentStatus.ACTIVE)
                .processStatus(DocumentProcessStatus.PROCESSING)
                .user(reviewer)
                .category(category)
                .folder(folder)
                .cloudFile(cloudFile)
                .sourceType(DocumentSourceType.SHARED_UPLOAD)
                .sourceSubmissionId(submission.getId())
                .contributedByUserId(submission.getUploaderUserId())
                .contributedByName(submission.getUploaderNameSnapshot())
                .contributedByEmail(submission.getUploaderEmailSnapshot())
                .createdAt(now)
                .updatedAt(now)
                .build();

        Document savedDoc = documentRepository.save(document);

        // Transition submission — quota stays charged
        submission.setStatus(SharedSubmissionStatus.APPROVED);
        submission.setApprovedDocumentId(savedDoc.getId());
        submission.setReviewedAt(now);
        submission.setReviewedBy(reviewer.getId());
        submission.setDeleteAfter(null); // approved submissions are never expired
        submissionRepository.save(submission);

        // Update link counter
        DocumentShareLink link = submission.getShareLink();
        if (link != null) {
            link.setActiveStoredBytes(Math.max(0, link.getActiveStoredBytes() - submission.getFileSize()));
            shareLinkRepository.save(link);
        }

        log.info("[SharedUpload] Approved submission id={} → Document id={} reviewer={} cloudId={}",
                submissionId, savedDoc.getId(), reviewer.getId(), submission.getCloudPublicId());

        Long savedDocId = savedDoc.getId();
        dispatchAfterCommit(() -> {
            documentProcessingAsyncService.processDocumentAsync(savedDocId);
            log.info("[SharedUpload] Async processing dispatched after commit for document id={}", savedDocId);
        });

        return toDocumentResponse(savedDoc);
    }

    // ─── Reject ───────────────────────────────────────────────────────────────

    /**
     * Rejects a pending submission.
     *
     * <p>Deletes the Cloudinary object synchronously, then releases quota.
     * If Cloudinary deletion fails, quota is NOT released and the public ID is
     * recorded in {@code cloudDeleteFailedId} for scheduler retry.
     */
    @Transactional
    public SharedDocumentSubmissionResponse rejectSubmission(
            Long submissionId, SharedDocumentRejectRequest request, User reviewer) {

        SharedDocumentSubmission submission = submissionRepository
                .findByIdAndOwnerUserId(submissionId, reviewer.getId())
                .orElseThrow(() -> new NotFoundException(
                        "Submission not found or does not belong to you: " + submissionId));

        if (submission.getStatus() != SharedSubmissionStatus.PENDING_REVIEW) {
            throw new RuntimeException("Cannot reject a submission with status: " + submission.getStatus());
        }

        LocalDateTime now = LocalDateTime.now();
        submission.setStatus(SharedSubmissionStatus.REJECTED);
        submission.setRejectReason(request.getReason());
        submission.setReviewedAt(now);
        submission.setReviewedBy(reviewer.getId());

        // Delete Cloudinary object synchronously
        boolean cloudDeleted = deleteCloudObjectSafely(submission);

        if (cloudDeleted) {
            // Release quota atomically after confirmed cloud deletion
            releaseQuotaAtomically(submission);
            releaseLinkStorage(submission);
            submission.setCloudDeleteFailedId(null);
        } else {
            // Cloud deletion failed — record for retry; do NOT release quota
            submission.setCloudDeleteFailedId(submission.getCloudPublicId());
            submission.setCloudDeleteAttempts(submission.getCloudDeleteAttempts() + 1);
        }

        SharedDocumentSubmission saved = submissionRepository.save(submission);
        log.info("[SharedUpload] Submission id={} rejected by userId={} cloudDeleted={}",
                submissionId, reviewer.getId(), cloudDeleted);
        return toResponse(saved);
    }

    // ─── Expiration cleanup (called by scheduler) ──────────────────────────────

    /**
     * Cleans up one expired PENDING_REVIEW submission.
     * Sequence: delete cloud object → release quota → mark EXPIRED.
     * If cloud deletion fails, quota is not released and the record is left for retry.
     */
    @Transactional
    public void cleanupExpiredSubmission(SharedDocumentSubmission staleRef) {
        Long id = staleRef.getId();

        SharedDocumentSubmission s = submissionRepository.findById(id).orElse(null);
        if (s == null) {
            log.info("[Cleanup] id={} already deleted — skip", id);
            return;
        }
        if (s.getStatus() == SharedSubmissionStatus.APPROVED) {
            log.info("[Cleanup] id={} is APPROVED — no cleanup needed", id);
            return;
        }

        boolean cloudDeleted = deleteCloudObjectSafely(s);

        if (cloudDeleted) {
            releaseQuotaAtomically(s);
            releaseLinkStorage(s);
            s.setCloudDeleteFailedId(null);
        } else {
            s.setCloudDeleteFailedId(s.getCloudPublicId());
            s.setCloudDeleteAttempts(s.getCloudDeleteAttempts() + 1);
            submissionRepository.save(s);
            return; // retry next scheduler run
        }

        if (s.getStatus() == SharedSubmissionStatus.PENDING_REVIEW) {
            s.setStatus(SharedSubmissionStatus.EXPIRED);
        }
        submissionRepository.save(s);
        log.info("[Cleanup] Completed for submission id={} finalStatus={}", id, s.getStatus());
    }

    /**
     * Retries cloud deletion for submissions where it previously failed.
     * Called by the scheduler separately from expiration.
     */
    @Transactional
    public void retryFailedCloudDeletion(SharedDocumentSubmission staleRef) {
        Long id = staleRef.getId();
        SharedDocumentSubmission s = submissionRepository.findById(id).orElse(null);
        if (s == null || s.getCloudDeleteFailedId() == null) return;

        boolean cloudDeleted = deleteCloudObjectSafely(s);
        if (cloudDeleted) {
            releaseQuotaAtomically(s);
            releaseLinkStorage(s);
            s.setCloudDeleteFailedId(null);
            submissionRepository.save(s);
            log.info("[Cleanup] Retry succeeded for submission id={}", id);
        } else {
            s.setCloudDeleteAttempts(s.getCloudDeleteAttempts() + 1);
            submissionRepository.save(s);
            log.warn("[Cleanup] Retry {} failed for submission id={}", s.getCloudDeleteAttempts(), id);
        }
    }

    // ─── Preview / download URL (owner only) ──────────────────────────────────

    /**
     * Returns the Cloudinary secure URL for the owner to preview the file.
     * Authorization is enforced — only the link owner may access.
     */
    @Transactional(readOnly = true)
    public String getCloudUrlForOwner(Long submissionId, Long ownerUserId) {
        SharedDocumentSubmission s = submissionRepository
                .findByIdAndOwnerUserId(submissionId, ownerUserId)
                .orElseThrow(() -> new NotFoundException(
                        "Submission not found or does not belong to you: " + submissionId));
        if (s.getCloudSecureUrl() == null || s.getCloudSecureUrl().isBlank()) {
            throw new RuntimeException("No cloud object found for submission: " + submissionId);
        }
        return s.getCloudSecureUrl();
    }

    // ─── List / get ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<SharedDocumentSubmissionResponse> getSubmissionsForOwner(
            Long ownerUserId, SharedSubmissionStatus statusFilter) {
        List<SharedDocumentSubmission> list = (statusFilter != null)
                ? submissionRepository.findByOwnerUserIdAndStatusOrderBySubmittedAtDesc(ownerUserId, statusFilter)
                : submissionRepository.findByOwnerUserIdOrderBySubmittedAtDesc(ownerUserId);
        return list.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SharedDocumentSubmissionResponse getSubmissionForOwner(Long submissionId, Long ownerUserId) {
        SharedDocumentSubmission s = submissionRepository.findByIdAndOwnerUserId(submissionId, ownerUserId)
                .orElseThrow(() -> new NotFoundException(
                        "Submission not found or does not belong to you: " + submissionId));
        return toResponse(s);
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /**
     * Attempts to delete the Cloudinary object for a submission.
     * Returns true if deleted (or object not found = already gone), false on error.
     */
    private boolean deleteCloudObjectSafely(SharedDocumentSubmission s) {
        String publicId = s.getCloudPublicId();
        if (publicId == null || publicId.isBlank()) {
            return true; // no cloud object to delete
        }
        try {
            cloudinaryStorageService.delete(publicId, s.getCloudResourceType());
            log.info("[Cleanup] Deleted Cloudinary object {} for submission id={}", publicId, s.getId());
            return true;
        } catch (Exception e) {
            log.error("[Cleanup] Cloudinary deletion failed for submission id={} publicId={}: {}",
                    s.getId(), publicId, e.getMessage());
            return false;
        }
    }

    /**
     * Atomically claims and executes a quota release.
     * Idempotent: if another thread already claimed (returns 0 rows), skip.
     */
    private void releaseQuotaAtomically(SharedDocumentSubmission s) {
        if (s.getQuotaOwnerId() == null || s.getFileSize() == null || s.getFileSize() <= 0) return;
        int claimed = submissionRepository.atomicClaimQuotaRelease(s.getId());
        if (claimed == 1) {
            storageQuotaService.releaseStorageForSubmission(s.getQuotaOwnerId(), s.getFileSize());
            s.setQuotaReleasedAt(LocalDateTime.now());
            log.info("[Cleanup] Released {}B quota for ownerId={} submission id={}",
                    s.getFileSize(), s.getQuotaOwnerId(), s.getId());
        } else {
            log.info("[Cleanup] Quota already released for submission id={}", s.getId());
        }
    }

    /** Releases the share-link byte-limit counter only after cloud deletion succeeds. */
    private void releaseLinkStorage(SharedDocumentSubmission s) {
        DocumentShareLink link = s.getShareLink();
        if (link == null || s.getFileSize() == null || s.getFileSize() <= 0) return;
        link.setActiveStoredBytes(Math.max(0, link.getActiveStoredBytes() - s.getFileSize()));
        shareLinkRepository.save(link);
    }

    private void validateAllowedFileTypes(DocumentShareLink link, String mimeType) {
        String allowed = link.getAllowedFileTypes();
        if (allowed == null || allowed.isBlank()) return;
        Set<String> allowedSet = new HashSet<>(Arrays.asList(allowed.split(",")));
        boolean ok = allowedSet.stream().anyMatch(t -> t.trim().equalsIgnoreCase(mimeType));
        if (!ok) {
            throw new FileTooLargeException(
                    "File type '" + mimeType + "' is not permitted by this share link.");
        }
    }

    private void dispatchAfterCommit(Runnable task) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { task.run(); }
            });
        } else {
            task.run();
        }
    }

    // ─── Mapper ───────────────────────────────────────────────────────────────

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
                .uploaderName(s.getUploaderNameSnapshot())
                .uploaderEmail(s.getUploaderEmailSnapshot())
                .originalFileName(s.getOriginalFileName())
                .fileType(s.getFileType())
                .fileSize(s.getFileSize())
                .cloudPublicId(s.getCloudPublicId())
                .title(s.getTitle())
                .description(s.getDescription())
                .status(s.getStatus())
                .approvedDocumentId(s.getApprovedDocumentId())
                .cloudSecureUrl(s.getCloudSecureUrl())
                .submittedAt(s.getSubmittedAt())
                .reviewedAt(s.getReviewedAt())
                .reviewedBy(s.getReviewedBy())
                .rejectReason(s.getRejectReason())
                .deleteAfter(s.getDeleteAfter())
                .quotaReleasedAt(s.getQuotaReleasedAt())
                .build();
    }

    private DocumentResponse toDocumentResponse(Document d) {
        DocumentResponse.DocumentResponseBuilder b = DocumentResponse.builder()
                .id(d.getId()).title(d.getTitle()).description(d.getDescription())
                .tags(d.getTags()).status(d.getStatus()).processStatus(d.getProcessStatus())
                .userId(d.getUser() != null ? d.getUser().getId() : null)
                .createdAt(d.getCreatedAt()).updatedAt(d.getUpdatedAt())
                .processedAt(d.getProcessedAt()).processErrorMessage(d.getProcessErrorMessage())
                .chunkCount(d.getChunkCount())
                .sourceType(d.getSourceType() != null ? d.getSourceType().name() : null)
                .sourceSubmissionId(d.getSourceSubmissionId())
                .contributedByUserId(d.getContributedByUserId())
                .contributedByName(d.getContributedByName())
                .contributedByEmail(d.getContributedByEmail());
        if (d.getCategory() != null) { b.categoryId(d.getCategory().getId()); b.categoryName(d.getCategory().getName()); }
        if (d.getFolder() != null) { b.folderId(d.getFolder().getId()); b.folderName(d.getFolder().getName()); }
        if (d.getCloudFile() != null) {
            CloudFile cf = d.getCloudFile();
            b.cloudFileId(cf.getId()).fileName(cf.getFileName()).originalName(cf.getOriginalName())
             .fileUrl(cf.getFileUrl()).fileType(cf.getFileType()).fileSize(cf.getFileSize())
             .storageProvider(cf.getStorageProvider());
        }
        return b.build();
    }

    private String buildTags(String documentType, String visibility) {
        StringBuilder sb = new StringBuilder();
        if (documentType != null && !documentType.isBlank()) sb.append(documentType.toUpperCase());
        if (visibility != null && !visibility.isBlank()) {
            if (!sb.isEmpty()) sb.append(",");
            sb.append(visibility.toUpperCase());
        }
        return sb.isEmpty() ? null : sb.toString();
    }
}
