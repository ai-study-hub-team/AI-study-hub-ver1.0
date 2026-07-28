package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.response.SharedItemResponse;
import com.aistudyhub.backend.dto.response.SharedUserResponse;
import com.aistudyhub.backend.dto.request.ShareRequest;
import com.aistudyhub.backend.dto.response.ShareResultResponse;
import com.aistudyhub.backend.entity.*;
import com.aistudyhub.backend.exception.BadRequestException;
import com.aistudyhub.backend.exception.ForbiddenException;
import com.aistudyhub.backend.exception.NotFoundException;
import com.aistudyhub.backend.repository.FolderRepository;
import com.aistudyhub.backend.repository.FolderShareRepository;
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
public class FolderShareService {

    private final FolderRepository folderRepository;
    private final FolderShareRepository folderShareRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final ShareValidationService shareValidationService;
    private final SmtpEmailService smtpEmailService;
    private final NotificationService notificationService;

    /**
     * Method share folder cho user khac
     * Lay user tu currentUser, kiem tra folder co ton tai hay active va co phai owner ko neu ko bao loi
     * Kiem tra mail dc share co ton tai hay ko, ko dc tu share cho chinh ban than neu ko bao loi, kiem tra folder nay tung
     * dc share cho user nay hay chua neu roi chi can update thay vi tao moi,kiem tra neu share da ton tai va ko co loi
     * gi thi ko tao lai ko thong bao moi
     * sau do gui thong bao he thong va gui thong bao qua mail
     */
    @Transactional
    public ShareResultResponse shareFolder(Long folderId, ShareRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        Folder folder = getFolderOrThrow(folderId);
        ensureOwner(folder, currentUser);

        DocumentSharePermission permission = shareValidationService.parsePermission(request.getPermission());
        shareValidationService.validateExpiresAt(request.getExpiresAt());
        Set<String> normalizedEmails = shareValidationService.normalizeEmails(request.getEmails());

        List<String> sharedEmails = new ArrayList<>();
        List<String> notFoundEmails = new ArrayList<>();
        List<String> alreadySharedEmails = new ArrayList<>();
        List<User> emailReceivers = new ArrayList<>();

        for (String email : normalizedEmails) {
            User receiver = userRepository.findByEmail(email).orElse(null);

            if (receiver == null) {
                notFoundEmails.add(email);
                continue;
            }

            if (receiver.getId().equals(currentUser.getId())) {
                throw new BadRequestException("Owner cannot share folder to yourself");
            }

            FolderShare share = folderShareRepository
                    .findByFolderIdAndSharedWithId(folder.getId(), receiver.getId())
                    .orElse(null);

            if (share != null && isActiveAndNotExpired(share)) {
                alreadySharedEmails.add(email);
                continue;
            }

            if (share == null) {
                share = FolderShare.builder()
                        .folder(folder)
                        .owner(currentUser)
                        .sharedWith(receiver)
                        .permission(permission)
                        .status(FolderShareStatus.ACTIVE)
                        .expiresAt(request.getExpiresAt())
                        .build();
            } else {
                share.setPermission(permission);
                share.setStatus(FolderShareStatus.ACTIVE);
                share.setExpiresAt(request.getExpiresAt());
            }

            folderShareRepository.save(share);
            notificationService.create(
                    receiver,
                    NotificationType.FOLDER_SHARED,
                    "Folder shared with you",
                    currentUser.getFullName() + " shared folder \"" + folder.getName() + "\" with you",
                    "FOLDER",
                    folder.getId(),
                    "/folders/" + folder.getId()
            );
            notificationService.create(
                    currentUser,
                    NotificationType.FOLDER_SHARE_SENT,
                    "Folder shared successfully",
                    "You shared folder \"" + folder.getName() + "\" with " + receiver.getEmail(),
                    "FOLDER",
                    folder.getId(),
                    "/app/folders/" + folder.getId()
            );
            sharedEmails.add(email);
            emailReceivers.add(receiver);
        }

        for (User receiver : emailReceivers) {
            try {
                smtpEmailService.sendFolderSharedEmail(receiver, currentUser, folder, permission);
            } catch (Exception ex) {
                log.warn(
                        "Failed to send folder share email. folderId={}, receiverEmail={}",
                        folder.getId(),
                        receiver.getEmail(),
                        ex
                );
            }
        }

        return ShareResultResponse.builder()
                .message("Share folder successfully")
                .sharedEmails(sharedEmails)
                .alreadySharedEmails(alreadySharedEmails)
                .notFoundEmails(notFoundEmails)
                .build();
    }

    /**
     * Xem nhung ai da duoc share
     * Lay user tu currentUser, tim doc theo folderid neu ko ton tai thi bao loi, kiem tra owner
     * Query bang lay cac share có status active, loc them share co con hieu luc khong
     * Chuyen cho SharedUserResponse cac thong tin nhu: shareId, userId, fullName, email, permission, status,
     * sharedAt, expiresAt
     */
    @Transactional(readOnly = true)
    public List<SharedUserResponse> getFolderShares(Long folderId) {
        User currentUser = currentUserService.getCurrentUser();
        Folder folder = getFolderOrThrow(folderId);
        ensureOwner(folder, currentUser);

        return folderShareRepository
                .findByFolderIdAndStatus(folder.getId(), FolderShareStatus.ACTIVE)
                .stream()
                .filter(this::isActiveAndNotExpired)
                .map(this::toSharedUserResponse)
                .toList();
    }

    /**
     * Method thu hoi quyen share cho 1 user
     * Ko cho revoke chinh owner neu truyen targetUserId la current owner thi bao loi
     * Tim folderId va Id user dc share
     * Neu share do da bi revoke hoac not active thi coi nhu khong co active share de revoke
     * Neu chua thi cap nhat tu active thanh revoked trong db
     */
    @Transactional
    public void revokeFolderShare(Long folderId, Long userId) {
        User currentUser = currentUserService.getCurrentUser();
        Folder folder = getFolderOrThrow(folderId);
        ensureOwner(folder, currentUser);

        if (currentUser.getId().equals(userId)) {
            throw new BadRequestException("Owner share cannot be revoked");
        }

        FolderShare share = folderShareRepository
                .findByFolderIdAndSharedWithId(folder.getId(), userId)
                .orElseThrow(() -> new NotFoundException("Folder share not found"));

        if (share.getStatus() != FolderShareStatus.ACTIVE) {
            throw new NotFoundException("Active folder share not found");
        }

        share.setStatus(FolderShareStatus.REVOKED);
        folderShareRepository.save(share);

        notificationService.create(
                currentUser,
                NotificationType.FOLDER_SHARE_REVOKED_BY_OWNER,
                "Folder share revoked",
                "You revoked " + share.getSharedWith().getEmail()
                        + "'s access to folder \"" + folder.getName() + "\"",
                "FOLDER",
                folder.getId(),
                "/app/folders/" + folder.getId()
        );
        notificationService.create(
                share.getSharedWith(),
                NotificationType.FOLDER_ACCESS_REVOKED,
                "Folder access removed",
                "Your access to folder \"" + folder.getName() + "\" was revoked",
                "FOLDER",
                folder.getId(),
                "/app/shared-with-me"
        );
    }


    @Transactional(readOnly = true)
    public List<SharedItemResponse> getSharedFoldersForCurrentUser() {
        User currentUser = currentUserService.getCurrentUser();

        return folderShareRepository
                .findActiveNonExpiredBySharedWithUserId(currentUser.getId(), LocalDateTime.now())
                .stream()
                .map(this::toSharedItemResponse)
                .toList();
    }

    private Folder getFolderOrThrow(Long folderId) {
        return folderRepository.findById(folderId)
                .orElseThrow(() -> new NotFoundException("Folder not found"));
    }

    private void ensureOwner(Folder folder, User currentUser) {
        if (folder.getUser() == null || !folder.getUser().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("Only folder owner can share this folder");
        }
    }

    private boolean isActiveAndNotExpired(FolderShare share) {
        return share.getStatus() == FolderShareStatus.ACTIVE
                && (share.getExpiresAt() == null || share.getExpiresAt().isAfter(LocalDateTime.now()));
    }

    private SharedUserResponse toSharedUserResponse(FolderShare share) {
        User sharedWith = share.getSharedWith();

        return SharedUserResponse.builder()
                .shareId(share.getId())
                .userId(sharedWith != null ? sharedWith.getId() : null)
                .fullName(sharedWith != null ? sharedWith.getFullName() : null)
                .email(sharedWith != null ? sharedWith.getEmail() : null)
                .permission(share.getPermission() != null ? share.getPermission().name() : null)
                .status(share.getStatus() != null ? share.getStatus().name() : null)
                .sharedAt(share.getCreatedAt())
                .expiresAt(share.getExpiresAt())
                .build();
    }

    private SharedItemResponse toSharedItemResponse(FolderShare share) {
        Folder folder = share.getFolder();
        User owner = share.getOwner();

        return SharedItemResponse.builder()
                .shareId(share.getId())
                .itemId(folder != null ? folder.getId() : null)
                .itemType("FOLDER")
                .title(folder != null ? folder.getName() : null)
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
