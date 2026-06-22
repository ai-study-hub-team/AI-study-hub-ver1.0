package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.request.DocumentRequest;
import com.aistudyhub.backend.dto.response.DocumentResponse;
import com.aistudyhub.backend.specification.DocumentSpecification;
import com.aistudyhub.backend.entity.*;
import com.aistudyhub.backend.repository.CategoryRepository;
import com.aistudyhub.backend.repository.DocumentRepository;
import com.aistudyhub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import lombok.extern.slf4j.Slf4j;
import com.aistudyhub.backend.repository.DocumentChunkRepository;
import java.io.IOException;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final FileStorageService fileStorageService;
    private final AiIntegrationService aiIntegrationService;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentProcessingAsyncService documentProcessingAsyncService;

    // Read upload dir from config (same value used in FileStorageService)
    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    // ─── Create ────────────────────────────────────────────────────────────────

    public DocumentResponse create(DocumentRequest request) {
        // 1. Validate user
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found with id: " + request.getUserId()));

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
     * @param file        the actual file from the multipart request
     * @param title       document title
     * @param description short description
     * @param documentType type label (e.g. "LECTURE", "EXERCISE") — stored in tags for now
     * @param visibility  visibility label (e.g. "PUBLIC", "PRIVATE") — stored in tags for now
     * @param userId      owner's user ID
     * @param categoryId  optional category ID
     */
    public DocumentResponse uploadDocument(
            MultipartFile file,
            String title,
            String description,
            String documentType,
            String visibility,
            Long userId,
            Long categoryId) throws IOException {

        log.info("Upload received — title='{}', originalName='{}', userId={}, categoryId={}",
                title, file.getOriginalFilename(), userId, categoryId);

        // 1. Validate user
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        // 2. Validate category (optional)
        Category category = null;
        if (categoryId != null) {
            category = categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new RuntimeException("Category not found with id: " + categoryId));
        }

        // 3. Save the file to the local "uploads/" directory
        //    fileStorageService will throw IllegalArgumentException for unsupported file types
        String savedFileName = fileStorageService.saveFile(file);

        // 4. Build the relative file path (e.g. "uploads/a1b2c3_lecture1.pdf")
        String filePath = uploadDir + "/" + savedFileName;

        // 5. Build CloudFile record
        CloudFile cloudFile = CloudFile.builder()
                .fileName(savedFileName)                                  // stored name on disk
                .originalName(file.getOriginalFilename())                 // name from user's computer
                .fileType(fileStorageService.detectMimeType(file))        // MIME type
                .fileSize(file.getSize())                                 // size in bytes
                .fileUrl(filePath)                                        // local path
                .storageProvider("LOCAL")                                 // storage type
                .uploadedAt(LocalDateTime.now())
                .build();

        // 6. Combine documentType and visibility into tags field (simple approach for now)
        String tags = buildTags(documentType, visibility);

        // 7. Build Document record with PROCESSING status (ready for background AI work)
        Document document = Document.builder()
                .title(title)
                .description(description)
                .tags(tags)
                .status(DocumentStatus.ACTIVE)
                .processStatus(DocumentProcessStatus.PROCESSING)
                .user(user)
                .category(category)
                .cloudFile(cloudFile)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Document saved = documentRepository.save(document);
        log.info("Document metadata saved — id={}, title='{}', processStatus=PROCESSING",
                saved.getId(), saved.getTitle());

        // 8. Fire-and-forget: AI processing runs in a background thread.
        //    The upload response is returned immediately to the frontend.
        documentProcessingAsyncService.processDocumentAsync(saved.getId());
        log.info("Background processing dispatched for document ID: {}", saved.getId());

        return toResponse(saved);
    }

    // ─── Read All (paginated, ACTIVE only) ─────────────────────────────────────

    public Page<DocumentResponse> getAll(Pageable pageable) {
        return documentRepository.findByStatus(DocumentStatus.ACTIVE, pageable)
                .map(this::toResponse);
    }

    // ─── Read One ──────────────────────────────────────────────────────────────

    public DocumentResponse getById(Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + id));

        // Don't return soft-deleted documents
        if (document.getStatus() == DocumentStatus.DELETED) {
            throw new RuntimeException("Document not found with id: " + id);
        }
        return toResponse(document);
    }

    // ─── Update ────────────────────────────────────────────────────────────────

    public DocumentResponse update(Long id, DocumentRequest request) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + id));

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
            if (request.getOriginalName() != null) cf.setOriginalName(request.getOriginalName());
            if (request.getFileUrl() != null) cf.setFileUrl(request.getFileUrl());
            if (request.getFileType() != null) cf.setFileType(request.getFileType());
            if (request.getFileSize() != null) cf.setFileSize(request.getFileSize());
        }

        return toResponse(documentRepository.save(document));
    }

    // ─── Soft Delete ───────────────────────────────────────────────────────────

    public void delete(Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + id));

        // Soft delete: change status to DELETED instead of removing from DB
        document.setStatus(DocumentStatus.DELETED);
        document.setUpdatedAt(LocalDateTime.now());
        documentRepository.save(document);
    }

    // ─── Reprocess Document ────────────────────────────────────────────────────

    /**
     * Synchronously reprocesses an existing document through the full AI pipeline:
     * text extraction → chunking → embedding → pgvector upsert → chunk save.
     *
     * <p>Unlike upload (which is async), reprocess is synchronous so the caller
     * receives the final {@code PROCESSED} or {@code FAILED} status immediately.</p>
     *
     * <p>Pre-flight validation errors (document deleted, missing file, etc.) mark
     * the document as {@code FAILED} before re-throwing, so the status is never
     * left stuck on {@code PROCESSING}.</p>
     */
    public DocumentResponse reprocessDocument(Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + id));

        if (document.getStatus() == DocumentStatus.DELETED) {
            throw new RuntimeException("Cannot reprocess a deleted document");
        }

        CloudFile cloudFile = document.getCloudFile();
        if (cloudFile == null || cloudFile.getFileUrl() == null) {
            markFailed(document, "Document file metadata not found");
            throw new RuntimeException("Document file metadata not found");
        }

        java.nio.file.Path path = java.nio.file.Paths.get(cloudFile.getFileUrl()).toAbsolutePath();
        if (!java.nio.file.Files.exists(path)) {
            markFailed(document, "Physical file does not exist at path: " + path);
            throw new RuntimeException("Physical file does not exist at path: " + path);
        }

        // Set status to PROCESSING immediately so the UI reflects the in-progress state
        document.setProcessStatus(DocumentProcessStatus.PROCESSING);
        document.setProcessErrorMessage(null);
        document.setUpdatedAt(LocalDateTime.now());
        documentRepository.save(document);

        long oldChunkCount = documentChunkRepository.countByDocumentId(id);
        log.info("Reprocessing document ID: {}. Old chunk count: {}. File path sent: {}",
                id, oldChunkCount, path);

        // Delegate to AiIntegrationService which handles:
        //  - calling the Python /process-document endpoint
        //  - deleting old document_chunks + pgvector embeddings
        //  - inserting new chunks
        //  - setting final status (PROCESSED or FAILED)
        DocumentProcessStatus processStatus = aiIntegrationService.processDocument(
                document.getId(),
                cloudFile.getFileName(),
                cloudFile.getOriginalName(),
                cloudFile.getFileUrl(),
                cloudFile.getFileType()
        );

        document = documentRepository.findById(id).orElseThrow();
        long newChunkCount = documentChunkRepository.countByDocumentId(id);
        log.info("Finished reprocessing document ID: {}. Final status: {}. New chunk count: {}",
                id, processStatus, newChunkCount);

        return toResponse(document);
    }

    /** Marks a document as FAILED with an error message (pre-flight validation helper). */
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
        return documentRepository.searchByKeyword(keyword, pageable)
                .map(this::toResponse);
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

        return documentRepository.findAll(
                DocumentSpecification.filterDocuments(
                        keyword,
                        categoryId,
                        processStatus,
                        fileType,
                        tag,
                        fromDate,
                        toDate
                ),
                pageable
        ).map(this::toResponse);
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
                .chunkCount(document.getChunkCount());

        // Category info
        if (document.getCategory() != null) {
            builder.categoryId(document.getCategory().getId());
            builder.categoryName(document.getCategory().getName());
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
            if (!sb.isEmpty()) sb.append(",");
            sb.append(visibility.toUpperCase());
        }
        return sb.isEmpty() ? null : sb.toString();
    }
}
