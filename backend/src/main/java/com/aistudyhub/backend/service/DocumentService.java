package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.request.DocumentRequest;
import com.aistudyhub.backend.dto.response.DocumentResponse;
import com.aistudyhub.backend.entity.*;
import com.aistudyhub.backend.repository.CategoryRepository;
import com.aistudyhub.backend.repository.DocumentRepository;
import com.aistudyhub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;

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

    // ─── Search ────────────────────────────────────────────────────────────────

    public Page<DocumentResponse> search(String keyword, Pageable pageable) {
        return documentRepository.searchByKeyword(keyword, pageable)
                .map(this::toResponse);
    }

    // ─── Mapper ────────────────────────────────────────────────────────────────

    private DocumentResponse toResponse(Document document) {
        DocumentResponse.DocumentResponseBuilder builder = DocumentResponse.builder()
                .id(document.getId())
                .title(document.getTitle())
                .description(document.getDescription())
                .tags(document.getTags())
                .status(document.getStatus())
                .userId(document.getUser() != null ? document.getUser().getId() : null)
                .createdAt(document.getCreatedAt())
                .updatedAt(document.getUpdatedAt());

        // Category info
        if (document.getCategory() != null) {
            builder.categoryId(document.getCategory().getId());
            builder.categoryName(document.getCategory().getName());
        }

        // File info
        if (document.getCloudFile() != null) {
            CloudFile cf = document.getCloudFile();
            builder.cloudFileId(cf.getId());
            builder.originalName(cf.getOriginalName());
            builder.fileUrl(cf.getFileUrl());
            builder.fileType(cf.getFileType());
            builder.fileSize(cf.getFileSize());
        }

        return builder.build();
    }
}
