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
    private final StorageQuotaService storageQuotaService;

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
                .submittedAt(LocalDateTime.now())
                .build();

        SharedDocumentSubmission saved = submissionRepository.save(submission);

        // 4. Increment the share link's upload counter
        link.setCurrentUploads(link.getCurrentUploads() + 1);
        link.setUpdatedAt(LocalDateTime.now());
        shareLinkRepository.save(link);

        log.info("[SharedUpload] Submission id={} created for shareLinkId={}, ownerUserId={}",
                saved.getId(), link.getId(), link.getOwner().getId());

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

        storageQuotaService.validateFileRestrictions(owner.getId(), submission.getFileType());
        storageQuotaService.validateFileSize(owner.getId(), submission.getFileSize());
        storageQuotaService.validateStorageLimit(owner.getId(), submission.getFileSize());

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
        storageQuotaService.addStorageUsage(owner.getId(), submission.getFileSize());
        log.info("[SharedUpload] Official Document id={} created from submission id={} for userId={}",
                savedDoc.getId(), submissionId, owner.getId());

        // ── Update submission ─────────────────────────────────────────────────
        submission.setStatus(SharedSubmissionStatus.APPROVED);
        submission.setApprovedDocumentId(savedDoc.getId());
        submission.setReviewedAt(now);
        submission.setReviewedBy(owner.getId());
        submissionRepository.save(submission);

        // ── Trigger async AI processing AFTER COMMIT ────────────────────────
        // The async thread must not start until the current transaction commits;
        // otherwise it cannot see the new Document row in the database.
        Long savedDocId = savedDoc.getId();
        dispatchProcessingAfterCommit(savedDocId);
        log.info("[SharedUpload] Async processing scheduled after commit for document id={}", savedDocId);

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
                .build();
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
            // Fallback: synchronisation not active (e.g. unit-test context)
            documentProcessingAsyncService.processDocumentAsync(documentId);
            log.info("[SharedUpload] Async processing dispatched immediately for document id={}", documentId);
        }
    }
}
