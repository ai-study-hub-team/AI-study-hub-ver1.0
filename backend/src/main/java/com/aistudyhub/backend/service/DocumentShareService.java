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
    private final SmtpEmailService smtpEmailService;
    private final ShareValidationService shareValidationService;
    private final NotificationService notificationService;

    /**
     * Method share document cho user khac
     * Lay user tu currentUser, kiem tra document co ton tai hay active va co phai owner ko neu ko bao loi
     * Kiem tra mail dc share co ton tai hay ko, ko dc tu share cho chinh ban than neu ko bao loi, kiem tra doc nay tung
     * dc share cho user nay hay chua neu roi chi can update thay vi tao moi,kiem tra neu share da ton tai va ko co loi
     * gi thi ko tao lai ko thong bao moi
     * sau do gui thong bao he thong va gui thong bao qua mail
     */
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
            notificationService.create(
                    currentUser,
                    NotificationType.DOCUMENT_SHARE_SENT,
                    "Document shared successfully",
                    "You shared document \"" + document.getTitle() + "\" with " + receiver.getEmail(),
                    "DOCUMENT",
                    document.getId(),
                    "/app/library/" + document.getId() + "/preview"
            );
            sharedEmails.add(email);
            emailReceivers.add(receiver);
        }

        for (User receiver : emailReceivers) {
            try {
                smtpEmailService.sendDocumentSharedEmail(receiver, currentUser, document, permission);
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

    /**
     * Xem nhung ai da duoc share
     * Lay user tu currentUser, tim doc theo documentid neu ko ton tai hoac ko active thi bao loi, kiem tra owner
     * Query bang lay cac share có status active, loc them share co con hieu luc khong
     * Chuyen cho SharedUserResponse cac thong tin nhu: shareId, userId, fullName, email, permission, status,
     * sharedAt, expiresAt
     */

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

    /**
     * Method thu hoi quyen share cho 1 user
     * Ko cho revoke chinh owner neu truyen targetUserId la current owner thi bao loi
     * Tim documentId va Id user dc share
     * Neu share do da bi revoke hoac not active thi coi nhu khong co active share de revoke
     * Neu chua thi cap nhat tu active thanh revoked trong db
     */

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

        notificationService.create(
                currentUser,
                NotificationType.DOCUMENT_SHARE_REVOKED_BY_OWNER,
                "Document share revoked",
                "You revoked " + share.getSharedWith().getEmail()
                        + "'s access to document \"" + document.getTitle() + "\"",
                "DOCUMENT",
                document.getId(),
                "/app/library/" + document.getId() + "/preview"
        );
        notificationService.create(
                share.getSharedWith(),
                NotificationType.DOCUMENT_ACCESS_REVOKED,
                "Document access removed",
                "Your access to document \"" + document.getTitle() + "\" was revoked",
                "DOCUMENT",
                document.getId(),
                "/app/shared-with-me"
        );
    }

    /**
     * Method dung cho flow Shared With Me de user xem cai doc duoc share cho minh
     */
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

    /**
     * dùng cho owner xem danh sách user được share document.
     */
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


    /**
     * dùng cho receiver xem danh sách document/folder được share với mình.
     */
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
