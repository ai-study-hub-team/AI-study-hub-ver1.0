package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.request.DocumentRequest;
import com.aistudyhub.backend.dto.response.DocumentResponse;
import com.aistudyhub.backend.exception.ConflictException;
import com.aistudyhub.backend.exception.ForbiddenException;
import com.aistudyhub.backend.exception.NotFoundException;
import com.aistudyhub.backend.specification.DocumentSpecification;
import com.aistudyhub.backend.entity.*;
import com.aistudyhub.backend.repository.CategoryRepository;
import com.aistudyhub.backend.repository.DocumentRepository;
import com.aistudyhub.backend.repository.FolderRepository;
import com.aistudyhub.backend.repository.UserRepository;
import com.aistudyhub.backend.repository.AiCitationRepository;
import com.aistudyhub.backend.repository.ChatSessionDocumentRepository;
import com.aistudyhub.backend.repository.DocumentChunkRepository;
import com.aistudyhub.backend.repository.DocumentNoteRepository;
import com.aistudyhub.backend.repository.DocumentPublicLinkRepository;
import com.aistudyhub.backend.repository.DocumentReportHistoryRepository;
import com.aistudyhub.backend.repository.DocumentReportRepository;
import com.aistudyhub.backend.repository.DocumentShareRepository;
import com.aistudyhub.backend.repository.DocumentSummaryRepository;
import com.aistudyhub.backend.repository.FavoriteRepository;
import com.aistudyhub.backend.repository.QuizAttemptAnswerRepository;
import com.aistudyhub.backend.repository.QuizAttemptRepository;
import com.aistudyhub.backend.repository.QuizOptionRepository;
import com.aistudyhub.backend.repository.QuizQuestionRepository;
import com.aistudyhub.backend.repository.QuizRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import lombok.extern.slf4j.Slf4j;
import com.aistudyhub.backend.repository.DocumentChunkRepository;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    /** File extensions accepted by the document upload system. */
    private static final Set<String> SUPPORTED_UPLOAD_EXTENSIONS = Set.of(
            "pdf", "docx", "xls", "xlsx", "txt", "ppt", "pptx",
            "png", "jpg", "jpeg", "webp", "gif",
            "mp4", "mov", "avi", "mkv",
            "mp3", "wav", "m4a", "ogg"
    );

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final FolderRepository folderRepository;
    private final FileStorageService fileStorageService;
    private final CloudinaryStorageService cloudinaryStorageService;
    private final AiIntegrationService aiIntegrationService;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentProcessingAsyncService documentProcessingAsyncService;
    private final DocumentAccessService documentAccessService;
    private final StorageQuotaService storageQuotaService;
    private final CurrentUserService currentUserService;
    private final AiCitationRepository aiCitationRepository;
    private final ChatSessionDocumentRepository chatSessionDocumentRepository;
    private final DocumentNoteRepository documentNoteRepository;
    private final DocumentPublicLinkRepository documentPublicLinkRepository;
    private final DocumentReportHistoryRepository documentReportHistoryRepository;
    private final DocumentReportRepository documentReportRepository;
    private final DocumentShareRepository documentShareRepository;
    private final DocumentSummaryRepository documentSummaryRepository;
    private final FavoriteRepository favoriteRepository;
    private final QuizAttemptAnswerRepository quizAttemptAnswerRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizOptionRepository quizOptionRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final QuizRepository quizRepository;
    private final PgvectorSearchService pgvectorSearchService;

    private final FolderAccessService folderAccessService;

    // ─── Create ────────────────────────────────────────────────────────────────

    public DocumentResponse create(DocumentRequest request) {
        // 1. Validate user
        User user = currentUserService.getCurrentUser();

        // 2. Validate category (optional)
        Category category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("Category not found with id: " + request.getCategoryId()));
        }

        // 3. Build CloudFile (placeholder metadata only — no real upload)
        CloudFile cloudFile = CloudFile.builder()
                .originalName(request.getOriginalName())
                .fileUrl(request.getFileUrl())
                .fileType(request.getFileType())
                .fileSize(request.getFileSize())
                .uploadedAt(LocalDateTime.now())
                .build();

        // 4. Build Document
        Document document = Document.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .tags(request.getTags())
                .status(DocumentStatus.ACTIVE)
                .user(user)
                .category(category)
                .cloudFile(cloudFile)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Document saved = documentRepository.save(document);
        return toResponse(saved);
    }

    // ─── Upload Document (with real file) ──────────────────────────────────────

    /**
     * Uploads a file and saves both Document and CloudFile metadata.
     * Returns immediately with status {@code PROCESSING}.
     * AI processing (text extraction, chunking, embedding, vector storage)
     * continues in the background via {@link DocumentProcessingAsyncService}.
     *
     * @param file         the actual file from the multipart request
     * @param title        document title
     * @param description  short description
     * @param documentType type label (e.g. "LECTURE", "EXERCISE") — stored in tags
     *                     for now
     * @param visibility   visibility label (e.g. "PUBLIC", "PRIVATE") — stored in
     *                     tags for now
     * @param categoryId   optional category ID
     */
    public DocumentResponse uploadDocument(
            MultipartFile file,
            String title,
            String description,
            String documentType,
            String visibility,
            Long categoryId,
            Long folderId
    ) throws IOException {

        log.info("Upload received — title='{}', originalName='{}', categoryId={}, folderId={}",
                title, file.getOriginalFilename(), categoryId, folderId);

        // 1. Validate user
        User user = currentUserService.getCurrentUser();
        Long userId = user.getId();

        // 2. Validate category (optional)
        Category category = null;
        if (categoryId != null) {
            category = categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new RuntimeException("Category not found with id: " + categoryId));
        }

        // 2b. Validate folder (optional) — must belong to the uploading user
        Folder folder = null;
        if (folderId != null) {
            folder = folderRepository.findByIdAndUserId(folderId, userId)
                    .orElseThrow(() -> new NotFoundException("Folder not found"));
        }

        // 3. Reject only file formats that the upload system does not support.
        validateSupportedUploadFileType(file);

        // 4. Keep the existing plan and quota restrictions.
        String mimeType = fileStorageService.detectMimeType(file);
        storageQuotaService.validateFileRestrictions(userId, mimeType);
        storageQuotaService.validateFileSize(userId, file.getSize());
        storageQuotaService.validateStorageLimit(userId, file.getSize());

        // 5. Upload the file to Cloudinary. The AI service will later download this
        // URL to a temporary local file for extraction.
        CloudinaryStorageService.UploadResult uploadResult = cloudinaryStorageService.upload(file);

        // 6. Build CloudFile record
        CloudFile cloudFile = CloudFile.builder()
                .fileName(uploadResult.getPublicId()) // Cloudinary public_id
                .originalName(file.getOriginalFilename()) // name from user's computer
                .fileType(mimeType) // MIME type
                .fileSize(file.getSize()) // size in bytes
                .fileUrl(uploadResult.getSecureUrl()) // Cloudinary secure URL
                .storageProvider(uploadResult.getStorageProvider())
                .uploadedAt(LocalDateTime.now())
                .build();

        // 7. Combine documentType and visibility into tags field (simple approach for
        // now)
        String tags = buildTags(documentType, visibility);

        // 8. Build Document record with PROCESSING status (ready for background AI
        // work)
        Document document = Document.builder()
                .title(title)
                .description(description)
                .tags(tags)
                .status(DocumentStatus.ACTIVE)
                .processStatus(DocumentProcessStatus.PROCESSING)
                .user(user)
                .category(category)
                .folder(folder)
                .cloudFile(cloudFile)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Document saved = documentRepository.save(document);
        log.info("Document metadata saved — id={}, title='{}', processStatus=PROCESSING",
                saved.getId(), saved.getTitle());

        storageQuotaService.addStorageUsage(userId, file.getSize());
        log.info("Storage usage increased for userId={} by {} bytes", userId, file.getSize());

        // 9. Fire-and-forget: AI processing runs in a background thread.
        // The upload response is returned immediately to the frontend.
        documentProcessingAsyncService.processDocumentAsync(saved.getId());
        log.info("Background processing dispatched for document ID: {}", saved.getId());

        return toResponse(saved);
    }

    // ─── Read All (paginated, ACTIVE only) ─────────────────────────────────────

    public Page<DocumentResponse> getAll(Pageable pageable) {
        return searchAndFilter(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                pageable
        );
    }

    // ─── Read One ──────────────────────────────────────────────────────────────

    public DocumentResponse getById(Long id) {
        Document document = documentAccessService.getAccessibleDocument(id);
        return toResponse(document);
    }

    // ─── Update ────────────────────────────────────────────────────────────────

    public DocumentResponse update(Long id, DocumentRequest request) {
        Document document = documentAccessService.getOwnedActiveDocument(id);

        if (document.getStatus() == DocumentStatus.DELETED) {
            throw new RuntimeException("Cannot update a deleted document");
        }

        document.setTitle(request.getTitle());
        document.setDescription(request.getDescription());
        document.setTags(request.getTags());
        document.setUpdatedAt(LocalDateTime.now());

        // Update category if provided
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("Category not found with id: " + request.getCategoryId()));
            document.setCategory(category);
        }

        // Update file metadata if provided
        if (document.getCloudFile() != null) {
            CloudFile cf = document.getCloudFile();
            if (request.getOriginalName() != null)
                cf.setOriginalName(request.getOriginalName());
            if (request.getFileUrl() != null)
                cf.setFileUrl(request.getFileUrl());
            if (request.getFileType() != null)
                cf.setFileType(request.getFileType());
            if (request.getFileSize() != null)
                cf.setFileSize(request.getFileSize());
        }

        return toResponse(documentRepository.save(document));
    }

    // ─── Move to Trash ─────────────────────────────────────────────────────────

    /**
     * Moves a document to trash instead of hard-deleting it.
     * Chunks, vectors, and the file are NOT touched here.
     * Permanent deletion happens either via the scheduler (30 days) or explicit DELETE /permanent.
     *
     * Idempotent: if already trashed, returns a clear message instead of re-trashing.
     */
    @Transactional
    public DocumentResponse delete(Long id) {
        User currentUser = currentUserService.getCurrentUser();
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Document not found with id: " + id));

        if (!documentAccessService.isOwner(currentUser, document)) {
            throw new ForbiddenException("Only the document owner can move it to trash");
        }

        if (document.isTrashed()) {
            // Idempotent: already in trash — just return current state
            log.info("[Trash] Document id={} is already in trash, no-op.", id);
            return toResponse(document);
        }

        LocalDateTime now = LocalDateTime.now();
        document.setTrashed(true);
        document.setTrashedAt(now);
        document.setDeleteAfter(now.plusDays(30));
        document.setTrashedBy(currentUser.getId());
        document.setUpdatedAt(now);
        Document saved = documentRepository.save(document);
        log.info("[Trash] Document id={} moved to trash by userId={}, deleteAfter={}",
                id, currentUser.getId(), saved.getDeleteAfter());
        return toResponse(saved);
    }

    // ─── Restore from Trash ────────────────────────────────────────────────────

    /**
     * Restores a trashed document to active state. No reprocessing needed.
     * Only the owner can restore their document.
     */
    @Transactional
    public DocumentResponse restore(Long id) {
        User currentUser = currentUserService.getCurrentUser();
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Document not found with id: " + id));

        if (!documentAccessService.isOwner(currentUser, document)) {
            throw new ForbiddenException("Only the document owner can restore it");
        }

        if (!document.isTrashed()) {
            throw new ConflictException("Document is not currently in trash.");
        }

        document.setTrashed(false);
        document.setTrashedAt(null);
        document.setDeleteAfter(null);
        document.setTrashedBy(null);
        document.setUpdatedAt(LocalDateTime.now());
        Document saved = documentRepository.save(document);
        log.info("[Trash] Document id={} restored by userId={}", id, currentUser.getId());
        return toResponse(saved);
    }

    // ─── Get Trash List ────────────────────────────────────────────────────────

    /**
     * Returns all trashed documents owned by the currently authenticated user.
     * userId is resolved from the JWT via {@link CurrentUserService} — never trusted from the client.
     */
    @Transactional(readOnly = true)
    public List<DocumentResponse> getTrashedDocuments() {
        User currentUser = currentUserService.getCurrentUser();
        return documentRepository.findTrashedByUserId(currentUser.getId())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─── Permanent Delete ──────────────────────────────────────────────────────

    /**
     * Permanently deletes a document — removes chunks, pgvector embeddings,
     * citations, file from disk, and the document record.
     *
     * Only the owner can call this.
     * The document must already be in trash (use DELETE /api/documents/{id} first).
     * Also called internally by the scheduler.
     */
    @Transactional
    public void permanentDelete(Long id) {
        User currentUser = currentUserService.getCurrentUser();
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Document not found with id: " + id));

        if (!documentAccessService.isOwner(currentUser, document)) {
            throw new ForbiddenException("Only the document owner can permanently delete it");
        }

        if (!document.isTrashed()) {
            throw new ConflictException("Document is not currently in trash.");
        }

        permanentDeleteInternal(document);
    }

    /**
     * Internal permanent delete — shared by explicit delete endpoint and nightly scheduler.
     * Deletes every relational record that depends on the document in FK-safe order,
     * then removes its chunks, embeddings, file, and record.
     * Chat sessions and their messages are retained; only their reference to the
     * permanently deleted document is removed.
     */
    @Transactional
    public void permanentDeleteInternal(Document document) {
        Long id = document.getId();
        Long ownerId = document.getUser() != null
                ? document.getUser().getId()
                : null;

        Long fileSize = document.getCloudFile() != null
                ? document.getCloudFile().getFileSize()
                : null;
        log.info("[Trash] Permanently deleting document id={}, title='{}'", id, document.getTitle());

        // 1. Remove this document from any chat sessions, preserving chat history.
        chatSessionDocumentRepository.deleteByDocumentId(id);
        log.info("[Trash] Removed chat-session document links for document id={}", id);

        // 2. Delete AI citations referencing this document
        aiCitationRepository.deleteByDocumentId(id);

        // 3. Delete document-owned records and their FK-dependent history.
        documentReportHistoryRepository.deleteByDocumentId(id);
        documentReportRepository.deleteByDocumentId(id);
        documentNoteRepository.deleteByDocumentId(id);
        documentPublicLinkRepository.deleteByDocumentId(id);
        documentShareRepository.deleteByDocumentId(id);
        documentSummaryRepository.deleteByDocumentId(id);
        favoriteRepository.deleteByDocumentId(id);

        // 4. Delete quiz data bottom-up (answers → attempts/options → questions → quizzes).
        quizAttemptAnswerRepository.deleteByDocumentId(id);
        quizAttemptRepository.deleteByDocumentId(id);
        quizOptionRepository.deleteByDocumentId(id);
        quizQuestionRepository.deleteByDocumentId(id);
        quizRepository.deleteByDocumentId(id);
        log.info("[Trash] Deleted all relational records for document id={}", id);

        // 5. Delete document chunks from PostgreSQL.
        documentChunkRepository.deleteByDocumentId(id);
        log.info("[Trash] Deleted chunks for document id={}", id);

        // 6. Delete pgvector embeddings.
        try {
            pgvectorSearchService.deleteEmbeddingsByDocumentId(id);
            log.info("[Trash] Deleted pgvector embeddings for document id={}", id);
        } catch (Exception e) {
            log.warn("[Trash] Could not delete pgvector embeddings for document id={}: {}", id, e.getMessage());
        }

        // 7. Delete the file from disk
        if (document.getCloudFile() != null && document.getCloudFile().getFileName() != null) {
            try {
                fileStorageService.deleteFile(document.getCloudFile().getFileName());
                log.info("[Trash] Deleted file '{}' for document id={}",
                        document.getCloudFile().getFileName(), id);
            } catch (Exception e) {
                log.warn("[Trash] Could not delete file for document id={}: {}", id, e.getMessage());
            }
        }

        // 8. Delete document record (CloudFile deleted via CascadeType.ALL)
        documentRepository.delete(document);
        log.info("[Trash] Document id={} permanently deleted.", id);
        // 9. Update storage quota only after permanent deletion
        if (ownerId != null && fileSize != null) {
            storageQuotaService.subtractStorageUsage(ownerId, fileSize);

            log.info(
                    "[Trash] Storage usage decreased for userId={} by {} bytes",
                    ownerId,
                    fileSize
            );
        }

        log.info(
                "[Trash] Document id={} permanently deleted.",
                id
        );
    }

    // ─── Reprocess Document ────────────────────────────────────────────────────

    /**
     * Synchronously reprocesses an existing document through the full AI pipeline:
     * text extraction → chunking → embedding → pgvector upsert → chunk save.
     *
     * <p>
     * Unlike upload (which is async), reprocess is synchronous so the caller
     * receives the final {@code PROCESSED} or {@code FAILED} status immediately.
     * </p>
     *
     * <p>
     * Pre-flight validation errors (document deleted, missing file, etc.) mark
     * the document as {@code FAILED} before re-throwing, so the status is never
     * left stuck on {@code PROCESSING}.
     * </p>
     */
    public DocumentResponse reprocessDocument(Long id) {
        Document document = documentAccessService.getOwnedActiveDocument(id);

        if (document.getStatus() == DocumentStatus.DELETED) {
            throw new RuntimeException("Cannot reprocess a deleted document");
        }

        CloudFile cloudFile = document.getCloudFile();
        if (cloudFile == null || cloudFile.getFileUrl() == null) {
            markFailed(document, "Document file metadata not found");
            throw new RuntimeException("Document file metadata not found");
        }

        String fileLocation = cloudFile.getFileUrl();
        if (!isRemoteUrl(fileLocation)) {
            java.nio.file.Path path = java.nio.file.Paths.get(fileLocation).toAbsolutePath();
            if (!java.nio.file.Files.exists(path)) {
                markFailed(document, "Physical file does not exist at path: " + path);
                throw new RuntimeException("Physical file does not exist at path: " + path);
            }
        }

        // Set status to PROCESSING immediately so the UI reflects the in-progress state
        document.setProcessStatus(DocumentProcessStatus.PROCESSING);
        document.setProcessErrorMessage(null);
        document.setUpdatedAt(LocalDateTime.now());
        documentRepository.save(document);

        long oldChunkCount = documentChunkRepository.countByDocumentId(id);
        log.info("Reprocessing document ID: {}. Old chunk count: {}. File location sent: {}",
                id, oldChunkCount, fileLocation);

        // Delegate to AiIntegrationService which handles:
        // - calling the Python /process-document endpoint
        // - deleting old document_chunks + pgvector embeddings
        // - inserting new chunks
        // - setting final status (PROCESSED or FAILED)
        DocumentProcessStatus processStatus = aiIntegrationService.processDocument(
                document.getId(),
                cloudFile.getFileName(),
                cloudFile.getOriginalName(),
                cloudFile.getFileUrl(),
                cloudFile.getFileType());

        document = documentRepository.findById(id).orElseThrow();
        long newChunkCount = documentChunkRepository.countByDocumentId(id);
        log.info("Finished reprocessing document ID: {}. Final status: {}. New chunk count: {}",
                id, processStatus, newChunkCount);

        return toResponse(document);
    }

    /**
     * Marks a document as FAILED with an error message (pre-flight validation
     * helper).
     */
    private void markFailed(Document document, String errorMessage) {
        try {
            document.setProcessStatus(DocumentProcessStatus.FAILED);
            document.setProcessErrorMessage(errorMessage);
            document.setProcessedAt(LocalDateTime.now());
            document.setUpdatedAt(LocalDateTime.now());
            documentRepository.save(document);
        } catch (Exception ex) {
            log.error("Could not persist FAILED status for document ID {}: {}",
                    document.getId(), ex.getMessage());
        }
    }

    // ─── Search ────────────────────────────────────────────────────────────────

    public Page<DocumentResponse> search(String keyword, Pageable pageable) {
        return searchAndFilter(
                keyword,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                pageable
        );
    }

    public Page<DocumentResponse> searchAndFilter(
            String keyword,
            Long categoryId,
            DocumentProcessStatus processStatus,
            String fileType,
            String tag,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            Pageable pageable) {
        return searchAndFilter(keyword, categoryId, processStatus,
                fileType, tag, fromDate, toDate, null, null, pageable);
    }

    /**
     * Extended search with optional folder filtering.
     *
     * @param folderId when non-null, return only documents in this folder
     * @param rootOnly when {@code true}, return only root-level documents (folder =
     *                 null)
     */
    public Page<DocumentResponse> searchAndFilter(
            String keyword,
            Long categoryId,
            DocumentProcessStatus processStatus,
            String fileType,
            String tag,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            Long folderId,
            Boolean rootOnly,
            Pageable pageable) {

        User currentUser = currentUserService.getCurrentUser();

        return documentRepository.findAll(
                DocumentSpecification.filterVisibleDocuments(
                        keyword,
                        categoryId,
                        processStatus,
                        fileType,
                        tag,
                        fromDate,
                        toDate,
                        folderId,
                        rootOnly,
                        currentUser
                ),
                pageable
        ).map(this::toResponse);
    }

    // ─── Move Document to Folder ───────────────────────────────────────────────

    /**
     * Moves a document into a folder, or back to root when {@code folderId} is
     * null.
     *
     * <p>
     * Security rules enforced:
     * <ul>
     * <li>Document must belong to {@code userId}.</li>
     * <li>Target folder (if non-null) must belong to {@code userId}.</li>
     * </ul>
     */
    @Transactional
    public DocumentResponse moveDocumentToFolder(Long documentId, Long folderId) {
        User currentUser = currentUserService.getCurrentUser();

        Document document = documentAccessService.getOwnedActiveDocument(documentId);

        Folder folder = null;
        if (folderId != null) {
            folder = folderRepository.findByIdAndUserId(folderId, currentUser.getId())
                    .orElseThrow(() -> new NotFoundException("Folder not found"));
        }

        document.setFolder(folder);
        document.setUpdatedAt(LocalDateTime.now());
        Document saved = documentRepository.save(document);

        log.info("[Document] Moved document id={} to folder id={} for userId={}",
                documentId, folderId, currentUser.getId());
        return toResponse(saved);
    }

    // ─── Mapper ────────────────────────────────────────────────────────────────

    private DocumentResponse toResponse(Document document) {
        DocumentResponse.DocumentResponseBuilder builder = DocumentResponse.builder()
                .id(document.getId())
                .title(document.getTitle())
                .description(document.getDescription())
                .tags(document.getTags())
                .status(document.getStatus())
                .processStatus(document.getProcessStatus())
                .userId(document.getUser() != null ? document.getUser().getId() : null)
                .createdAt(document.getCreatedAt())
                .updatedAt(document.getUpdatedAt())
                .processedAt(document.getProcessedAt())
                .processErrorMessage(document.getProcessErrorMessage())
                .chunkCount(document.getChunkCount())
                // Trash fields
                .isTrashed(document.isTrashed())
                .trashedAt(document.getTrashedAt())
                .deleteAfter(document.getDeleteAfter())
                .trashedBy(document.getTrashedBy());

        // Category info
        if (document.getCategory() != null) {
            builder.categoryId(document.getCategory().getId());
            builder.categoryName(document.getCategory().getName());
        }

        // Folder info (null = root level)
        if (document.getFolder() != null) {
            builder.folderId(document.getFolder().getId());
            builder.folderName(document.getFolder().getName());
        }

        // File info
        if (document.getCloudFile() != null) {
            CloudFile cf = document.getCloudFile();
            builder.cloudFileId(cf.getId());
            builder.fileName(cf.getFileName());
            builder.originalName(cf.getOriginalName());
            builder.fileUrl(cf.getFileUrl());
            builder.fileType(cf.getFileType());
            builder.fileSize(cf.getFileSize());
            builder.storageProvider(cf.getStorageProvider());
        }

        // Provenance (shared-upload fields; null for direct uploads)
        if (document.getSourceType() != null) {
            builder.sourceType(document.getSourceType().name());
        }
        builder.sourceSubmissionId(document.getSourceSubmissionId());
        builder.contributedByUserId(document.getContributedByUserId());
        builder.contributedByName(document.getContributedByName());
        builder.contributedByEmail(document.getContributedByEmail());

        return builder.build();
    }

    // ─── Helper ────────────────────────────────────────────────────────────────

    /**
     * Combines documentType and visibility into a comma-separated tags string.
     * Example: "LECTURE,PUBLIC"
     */
    private String buildTags(String documentType, String visibility) {
        StringBuilder sb = new StringBuilder();
        if (documentType != null && !documentType.isBlank()) {
            sb.append(documentType.toUpperCase());
        }
        if (visibility != null && !visibility.isBlank()) {
            if (!sb.isEmpty())
                sb.append(",");
            sb.append(visibility.toUpperCase());
        }
        return sb.isEmpty() ? null : sb.toString();
    }

    private void validateSupportedUploadFileType(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new IllegalArgumentException("File name must not be empty.");
        }

        int lastDot = originalFilename.lastIndexOf('.');
        String extension = lastDot >= 0 && lastDot < originalFilename.length() - 1
                ? originalFilename.substring(lastDot + 1).toLowerCase(Locale.ROOT)
                : "";

        if (!SUPPORTED_UPLOAD_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException(
                    "This file format is not supported by the system. "
                            + "Supported formats: documents (PDF, DOCX, XLS, XLSX, TXT, PPT, PPTX), "
                            + "images (PNG, JPG, JPEG, WEBP, GIF), videos (MP4, MOV, AVI, MKV), "
                            + "and audio (MP3, WAV, M4A, OGG).");
        }
    }

    private boolean isRemoteUrl(String value) {
        return value != null && (value.startsWith("http://") || value.startsWith("https://"));
    }

    public DocumentResponse getDownloadableById(Long id) {
        Document document = documentAccessService.getDownloadableDocument(id);
        return toResponse(document);
    }

    @Transactional(readOnly = true)
    public java.util.List<DocumentResponse> getDocumentsInAccessibleFolder(Long folderId) {
        User currentUser = currentUserService.getCurrentUser();
        Folder folder = folderAccessService.getAccessibleFolder(currentUser, folderId);

        return documentRepository.findByFolderIdAndStatus(folder.getId(), DocumentStatus.ACTIVE)
                .stream()
                .filter(document -> documentAccessService.canViewDocument(currentUser, document))
                .map(this::toResponse)
                .toList();
    }

}

