package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.request.ShareFolderRequest;
import com.aistudyhub.backend.dto.response.ShareDocumentResponse;
import com.aistudyhub.backend.dto.response.SharedItemResponse;
import com.aistudyhub.backend.dto.response.SharedUserResponse;
import com.aistudyhub.backend.entity.DocumentSharePermission;
import com.aistudyhub.backend.entity.Folder;
import com.aistudyhub.backend.entity.FolderShare;
import com.aistudyhub.backend.entity.FolderShareStatus;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.exception.BadRequestException;
import com.aistudyhub.backend.exception.ForbiddenException;
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
    private final ResendEmailService resendEmailService;

    @Transactional
    public ShareDocumentResponse shareFolder(Long folderId, ShareFolderRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        Folder folder = getFolderOrThrow(folderId);
        ensureOwner(folder, currentUser);

        DocumentSharePermission permission = shareValidationService.parsePermission(request.getPermission());
        shareValidationService.validateExpiresAt(request.getExpiresAt());
        Set<String> normalizedEmails = shareValidationService.normalizeEmails(request.getEmails());

        List<String> sharedEmails = new ArrayList<>();
        List<String> notRegisteredEmails = new ArrayList<>();
        List<String> alreadySharedEmails = new ArrayList<>();
        List<User> emailReceivers = new ArrayList<>();

        for (String email : normalizedEmails) {
            User receiver = userRepository.findByEmail(email).orElse(null);

            if (receiver == null) {
                notRegisteredEmails.add(email);
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
            sharedEmails.add(email);
            emailReceivers.add(receiver);
        }

        for (User receiver : emailReceivers) {
            try {
                resendEmailService.sendFolderSharedEmail(receiver, currentUser, folder, permission);
            } catch (Exception ex) {
                log.warn(
                        "Failed to send folder share email. folderId={}, receiverEmail={}",
                        folder.getId(),
                        receiver.getEmail(),
                        ex
                );
            }
        }

        return ShareDocumentResponse.builder()
                .message("Folder share completed")
                .sharedEmails(sharedEmails)
                .notRegisteredEmails(notRegisteredEmails)
                .alreadySharedEmails(alreadySharedEmails)
                .build();
    }

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

    @Transactional
    public void revokeFolderShare(Long folderId, Long shareId) {
        User currentUser = currentUserService.getCurrentUser();
        Folder folder = getFolderOrThrow(folderId);
        ensureOwner(folder, currentUser);

        FolderShare share = folderShareRepository
                .findByIdAndFolderId(shareId, folder.getId())
                .orElseThrow(() -> new RuntimeException("Folder share not found"));

        share.setStatus(FolderShareStatus.REVOKED);
        folderShareRepository.save(share);
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
                .orElseThrow(() -> new RuntimeException("Folder not found with id: " + folderId));
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
                .userId(sharedWith != null ? sharedWith.getId() : null)
                .fullName(sharedWith != null ? sharedWith.getFullName() : null)
                .email(sharedWith != null ? sharedWith.getEmail() : null)
                .permission(share.getPermission() != null ? share.getPermission().name() : null)
                .status(share.getStatus() != null ? share.getStatus().name() : null)
                .createdAt(share.getCreatedAt())
                .expiresAt(share.getExpiresAt())
                .build();
    }

    private SharedItemResponse toSharedItemResponse(FolderShare share) {
        Folder folder = share.getFolder();
        User owner = share.getOwner();

        return SharedItemResponse.builder()
                .shareId(share.getId())
                .resourceId(folder != null ? folder.getId() : null)
                .resourceType("FOLDER")
                .name(folder != null ? folder.getName() : null)
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
