package com.aistudyhub.backend.service;

import com.aistudyhub.backend.entity.Document;
import com.aistudyhub.backend.entity.DocumentSharePermission;
import com.aistudyhub.backend.entity.DocumentStatus;
import com.aistudyhub.backend.entity.Folder;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.enums.UserRole;
import com.aistudyhub.backend.exception.ForbiddenException;
import com.aistudyhub.backend.exception.NotFoundException;
import com.aistudyhub.backend.repository.DocumentRepository;
import com.aistudyhub.backend.repository.DocumentShareRepository;
import com.aistudyhub.backend.repository.FolderShareRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class DocumentAccessService {

    private final DocumentRepository documentRepository;
    private final DocumentShareRepository documentShareRepository;
    private final FolderShareRepository folderShareRepository;
    private final CurrentUserService currentUserService;
    private final RolePolicyService rolePolicyService;

    @Transactional(readOnly = true)
    public Document getAccessibleDocument(Long documentId) {
        User currentUser = currentUserService.getCurrentUser();
        return getAccessibleDocument(currentUser, documentId);
    }

    @Transactional(readOnly = true)
    public Document getAccessibleDocument(User user, Long documentId) {
        Document document = getActiveDocumentOrThrow(documentId);

        if (!canViewDocument(user, document)) {
            throw new ForbiddenException("You do not have permission to access this document");
        }

        return document;
    }

    @Transactional(readOnly = true)
    public Document getDownloadableDocument(Long documentId) {
        User currentUser = currentUserService.getCurrentUser();
        return getDownloadableDocument(currentUser, documentId);
    }

    @Transactional(readOnly = true)
    public Document getDownloadableDocument(User user, Long documentId) {
        Document document = getActiveDocumentOrThrow(documentId);

        if (!canDownloadDocument(user, document)) {
            throw new ForbiddenException("You do not have permission to download this document");
        }

        return document;
    }

    @Transactional(readOnly = true)
    public boolean canViewDocument(Long documentId) {
        User currentUser = currentUserService.getCurrentUser();
        Document document = getActiveDocumentOrThrow(documentId);
        return canViewDocument(currentUser, document);
    }

    @Transactional(readOnly = true)
    public boolean canViewDocument(User user, Document document) {
        return canAccessDocument(user, document);
    }

    @Transactional(readOnly = true)
    public boolean canAccessDocument(User user, Document document) {
        if (user == null || document == null || document.getStatus() != DocumentStatus.ACTIVE) {
            return false;
        }

        if (rolePolicyService.isManagementAccount(user)) {
            return true;
        }

        if (isOwner(user, document)) {
            return true;
        }

        if (isPublicDocument(document)) {
            return true;
        }

        if (documentShareRepository.hasActiveNonExpiredShare(document.getId(), user.getId())) {
            return true;
        }

        Folder folder = document.getFolder();
        return folder != null
                && folderShareRepository.hasActiveNonExpiredShare(folder.getId(), user.getId());
    }

    @Transactional(readOnly = true)
    public boolean canDownloadDocument(User user, Document document) {
        if (user == null || document == null || document.getStatus() != DocumentStatus.ACTIVE) {
            return false;
        }

        if (rolePolicyService.isManagementAccount(user)) {
            return true;
        }

        if (isOwner(user, document)) {
            return true;
        }

        // Project hiện không có field allowDownload trên Document.
        // Giữ hành vi cũ: document có tag PUBLIC được download.
        if (isPublicDocument(document)) {
            return true;
        }

        if (documentShareRepository.hasActiveNonExpiredShareWithPermission(
                document.getId(),
                user.getId(),
                DocumentSharePermission.DOWNLOAD
        )) {
            return true;
        }

        Folder folder = document.getFolder();
        return folder != null
                && folderShareRepository.hasActiveNonExpiredShareWithPermission(
                folder.getId(),
                user.getId(),
                DocumentSharePermission.DOWNLOAD
        );
    }

    public boolean isOwner(User user, Document document) {
        return user != null
                && document != null
                && document.getUser() != null
                && user.getId().equals(document.getUser().getId());
    }

    public boolean isPublicDocument(Document document) {
        if (document == null || document.getTags() == null || document.getTags().isBlank()) {
            return false;
        }

        return Arrays.stream(document.getTags().split(","))
                .map(tag -> tag.trim().toUpperCase(Locale.ROOT))
                .anyMatch("PUBLIC"::equals);
    }

    private Document getActiveDocumentOrThrow(Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new NotFoundException("Document not found"));

        if (document.getStatus() != DocumentStatus.ACTIVE) {
            throw new NotFoundException("Document not found");
        }

        // Trashed documents are inaccessible via normal document access
        if (document.isTrashed()) {
            throw new NotFoundException("Document not found");
        }

        return document;
    }

    @Transactional(readOnly = true)
    public Document getOwnedActiveDocument(Long documentId) {
        User currentUser = currentUserService.getCurrentUser();
        Document document = getActiveDocumentOrThrow(documentId);

        if (!isOwner(currentUser, document)) {
            throw new ForbiddenException("Only document owner can perform this action");
        }

        return document;
    }
}
