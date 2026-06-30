package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.request.ShareDocumentRequest;
import com.aistudyhub.backend.dto.response.ShareDocumentResponse;
import com.aistudyhub.backend.dto.response.SharedUserResponse;
import com.aistudyhub.backend.entity.Document;
import com.aistudyhub.backend.entity.DocumentShare;
import com.aistudyhub.backend.entity.DocumentSharePermission;
import com.aistudyhub.backend.entity.DocumentShareStatus;
import com.aistudyhub.backend.entity.DocumentStatus;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.exception.BadRequestException;
import com.aistudyhub.backend.exception.ForbiddenException;
import com.aistudyhub.backend.repository.DocumentRepository;
import com.aistudyhub.backend.repository.DocumentShareRepository;
import com.aistudyhub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentShareService {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final DocumentShareRepository documentShareRepository;
    private final CurrentUserService currentUserService;
    private final ResendEmailService resendEmailService;

    @Transactional
    public ShareDocumentResponse shareDocumentToUsers(
            Long documentId,
            ShareDocumentRequest request
    ) {
        User currentUser = currentUserService.getCurrentUser();
        Document document = getActiveDocument(documentId);
        ensureOwner(document, currentUser);

        DocumentSharePermission permission = parsePermission(request.getPermission());
        validateExpiresAt(request.getExpiresAt());

        List<String> sharedEmails = new ArrayList<>();
        List<String> notRegisteredEmails = new ArrayList<>();
        List<String> alreadySharedEmails = new ArrayList<>();
        List<User> emailReceivers = new ArrayList<>();

        Set<String> normalizedEmails = normalizeEmails(request.getEmails());

        for (String email : normalizedEmails) {
            User receiver = userRepository.findByEmail(email).orElse(null);

            if (receiver == null) {
                notRegisteredEmails.add(email);
                continue;
            }

            if (receiver.getId().equals(currentUser.getId())) {
                throw new BadRequestException("Owner cannot share document to yourself");
            }

            DocumentShare share = documentShareRepository
                    .findByDocumentIdAndSharedWithId(document.getId(), receiver.getId())
                    .orElse(null);

            if (share != null && isActiveAndNotExpired(share)) {
                alreadySharedEmails.add(email);
                continue;
            }

            if (share == null) {
                share = DocumentShare.builder()
                        .document(document)
                        .owner(currentUser)
                        .sharedWith(receiver)
                        .permission(permission)
                        .status(DocumentShareStatus.ACTIVE)
                        .expiresAt(request.getExpiresAt())
                        .build();
            } else {
                share.setPermission(permission);
                share.setStatus(DocumentShareStatus.ACTIVE);
                share.setExpiresAt(request.getExpiresAt());
            }

            documentShareRepository.save(share);
            sharedEmails.add(email);
            emailReceivers.add(receiver);
        }

        for (User receiver : emailReceivers) {
            try {
                resendEmailService.sendDocumentSharedEmail(receiver, currentUser, document);
            } catch (Exception ex) {
                log.warn(
                        "Failed to send share email. documentId={}, receiverEmail={}",
                        document.getId(),
                        receiver.getEmail(),
                        ex
                );
            }
        }

        return ShareDocumentResponse.builder()
                .message("Document share completed")
                .sharedEmails(sharedEmails)
                .notRegisteredEmails(notRegisteredEmails)
                .alreadySharedEmails(alreadySharedEmails)
                .build();
    }

    @Transactional(readOnly = true)
    public List<SharedUserResponse> getSharedUsers(Long documentId) {
        User currentUser = currentUserService.getCurrentUser();
        Document document = getActiveDocument(documentId);
        ensureOwner(document, currentUser);

        return documentShareRepository
                .findByDocumentIdAndStatus(document.getId(), DocumentShareStatus.ACTIVE)
                .stream()
                .filter(this::isActiveAndNotExpired)
                .map(this::toSharedUserResponse)
                .toList();
    }

    @Transactional
    public void revokeShare(Long documentId, Long userId) {
        User currentUser = currentUserService.getCurrentUser();
        Document document = getActiveDocument(documentId);
        ensureOwner(document, currentUser);

        if (currentUser.getId().equals(userId)) {
            throw new BadRequestException("Owner share cannot be revoked");
        }

        DocumentShare share = documentShareRepository
                .findByDocumentIdAndSharedWithId(document.getId(), userId)
                .orElseThrow(() -> new RuntimeException("Document share not found"));

        share.setStatus(DocumentShareStatus.REVOKED);
        documentShareRepository.save(share);
    }

    private Document getActiveDocument(Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + documentId));

        if (document.getStatus() != DocumentStatus.ACTIVE) {
            throw new RuntimeException("Document not found with id: " + documentId);
        }

        return document;
    }

    private void ensureOwner(Document document, User currentUser) {
        if (document.getUser() == null
                || !document.getUser().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("Only document owner can share this document");
        }
    }

    private DocumentSharePermission parsePermission(String rawPermission) {
        if (rawPermission == null || rawPermission.isBlank()) {
            return DocumentSharePermission.VIEW;
        }

        try {
            return DocumentSharePermission.valueOf(
                    rawPermission.trim().toUpperCase(Locale.ROOT)
            );
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("permission must be VIEW or DOWNLOAD");
        }
    }

    private void validateExpiresAt(LocalDateTime expiresAt) {
        if (expiresAt != null && !expiresAt.isAfter(LocalDateTime.now())) {
            throw new BadRequestException("expiresAt must be in the future");
        }
    }

    private Set<String> normalizeEmails(List<String> emails) {
        Set<String> normalizedEmails = new LinkedHashSet<>();

        for (String email : emails) {
            if (email == null || email.isBlank()) {
                continue;
            }

            normalizedEmails.add(email.trim().toLowerCase(Locale.ROOT));
        }

        if (normalizedEmails.isEmpty()) {
            throw new BadRequestException("emails must not be empty");
        }

        return normalizedEmails;
    }

    private boolean isActiveAndNotExpired(DocumentShare share) {
        return share.getStatus() == DocumentShareStatus.ACTIVE
                && (share.getExpiresAt() == null
                || share.getExpiresAt().isAfter(LocalDateTime.now()));
    }

    private SharedUserResponse toSharedUserResponse(DocumentShare share) {
        User sharedWith = share.getSharedWith();

        return SharedUserResponse.builder()
                .userId(sharedWith != null ? sharedWith.getId() : null)
                .fullName(sharedWith != null ? sharedWith.getFullName() : null)
                .email(sharedWith != null ? sharedWith.getEmail() : null)
                .permission(share.getPermission() != null ? share.getPermission().name() : null)
                .status(share.getStatus() != null ? share.getStatus().name() : null)
                .createdAt(share.getCreatedAt())
                .expiresAt(share.getExpiresAt())
                .build();
    }
}
