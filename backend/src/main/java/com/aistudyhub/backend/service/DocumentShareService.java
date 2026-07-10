package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.response.ShareResultResponse;
import com.aistudyhub.backend.dto.response.SharedItemResponse;
import com.aistudyhub.backend.dto.response.SharedUserResponse;
import com.aistudyhub.backend.dto.request.ShareRequest;
import com.aistudyhub.backend.entity.*;
import com.aistudyhub.backend.exception.BadRequestException;
import com.aistudyhub.backend.exception.ForbiddenException;
import com.aistudyhub.backend.exception.NotFoundException;
import com.aistudyhub.backend.repository.DocumentRepository;
import com.aistudyhub.backend.repository.DocumentShareRepository;
import com.aistudyhub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
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
    private final ShareValidationService shareValidationService;
    private final NotificationService notificationService;

    @Transactional
    public ShareResultResponse shareDocumentToUsers(Long documentId, ShareRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        Document document = getActiveDocument(documentId);
        ensureOwner(document, currentUser);

        DocumentSharePermission permission = shareValidationService.parsePermission(request.getPermission());
        shareValidationService.validateExpiresAt(request.getExpiresAt());

        List<String> sharedEmails = new ArrayList<>();
        List<String> notFoundEmails = new ArrayList<>();
        List<String> alreadySharedEmails = new ArrayList<>();
        List<User> emailReceivers = new ArrayList<>();

        Set<String> normalizedEmails = shareValidationService.normalizeEmails(request.getEmails());

        for (String email : normalizedEmails) {
            User receiver = userRepository.findByEmail(email).orElse(null);

            if (receiver == null) {
                notFoundEmails.add(email);
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
            notificationService.create(
                    receiver,
                    NotificationType.DOCUMENT_SHARED,
                    "Document shared with you",
                    currentUser.getFullName() + " shared document \"" + document.getTitle() + "\" with you",
                    "DOCUMENT",
                    document.getId(),
                    "/documents/" + document.getId()
            );
            sharedEmails.add(email);
            emailReceivers.add(receiver);
        }

        for (User receiver : emailReceivers) {
            try {
                resendEmailService.sendDocumentSharedEmail(receiver, currentUser, document, permission);
            } catch (Exception ex) {
                log.warn("Failed to send share email. documentId={}, receiverEmail={}",
                        document.getId(), receiver.getEmail(), ex);
            }
        }

        return ShareResultResponse.builder()
                .message("Share document successfully")
                .sharedEmails(sharedEmails)
                .alreadySharedEmails(alreadySharedEmails)
                .notFoundEmails(notFoundEmails)
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
                .orElseThrow(() -> new NotFoundException("Document share not found"));

        if (share.getStatus() != DocumentShareStatus.ACTIVE) {
            throw new NotFoundException("Active document share not found");
        }

        share.setStatus(DocumentShareStatus.REVOKED);
        documentShareRepository.save(share);
    }

    @Transactional(readOnly = true)
    public List<SharedItemResponse> getSharedDocumentsForCurrentUser() {
        User currentUser = currentUserService.getCurrentUser();

        return documentShareRepository
                .findActiveNonExpiredBySharedWithUserId(currentUser.getId(), LocalDateTime.now())
                .stream()
                .map(this::toSharedItemResponse)
                .toList();
    }

    private Document getActiveDocument(Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new NotFoundException("Document not found"));

        if (document.getStatus() != DocumentStatus.ACTIVE) {
            throw new NotFoundException("Document not found");
        }

        return document;
    }

    private void ensureOwner(Document document, User currentUser) {
        if (document.getUser() == null
                || !document.getUser().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("Only document owner can share this document");
        }
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
                .shareId(share.getId())
                .sharedAt(share.getCreatedAt())
                .expiresAt(share.getExpiresAt())
                .build();
    }

    private SharedItemResponse toSharedItemResponse(DocumentShare share) {
        Document document = share.getDocument();
        User owner = share.getOwner();

        return SharedItemResponse.builder()
                .shareId(share.getId())
                .itemId(document != null ? document.getId() : null)
                .itemType("DOCUMENT")
                .title(document != null ? document.getTitle() : null)
                .ownerId(owner != null ? owner.getId() : null)
                .ownerName(owner != null ? owner.getFullName() : null)
                .ownerEmail(owner != null ? owner.getEmail() : null)
                .permission(share.getPermission() != null ? share.getPermission().name() : null)
                .sharedAt(share.getCreatedAt())
                .expiresAt(share.getExpiresAt())
                .status(share.getStatus() != null ? share.getStatus().name() : null)
                .build();
    }
}
