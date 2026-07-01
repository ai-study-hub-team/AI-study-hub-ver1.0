package com.aistudyhub.backend.service;

import com.aistudyhub.backend.entity.Document;
import com.aistudyhub.backend.entity.DocumentStatus;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.entity.DocumentSharePermission;
import com.aistudyhub.backend.enums.UserRole;
import com.aistudyhub.backend.exception.ForbiddenException;
import com.aistudyhub.backend.repository.DocumentRepository;
import com.aistudyhub.backend.repository.DocumentShareRepository;
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
    private final CurrentUserService currentUserService;

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

        if (user.getRole() == UserRole.ADMIN) {
            return true;
        }

        if (isOwner(user, document)) {
            return true;
        }

        // Giu lai co che public cu cua project: tags co PUBLIC.
        if (isPublicDocument(document)) {
            return true;
        }

        return documentShareRepository.hasActiveNonExpiredShare(
                document.getId(),
                user.getId()
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
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + documentId));

        if (document.getStatus() != DocumentStatus.ACTIVE) {
            throw new RuntimeException("Document not found with id: " + documentId);
        }

        return document;
    }



}
