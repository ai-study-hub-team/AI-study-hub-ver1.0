package com.aistudyhub.backend.service;

import com.aistudyhub.backend.entity.DocumentSharePermission;
import com.aistudyhub.backend.entity.Folder;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.enums.UserRole;
import com.aistudyhub.backend.exception.ForbiddenException;
import com.aistudyhub.backend.repository.FolderRepository;
import com.aistudyhub.backend.repository.FolderShareRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FolderAccessService {

    private final FolderRepository folderRepository;
    private final FolderShareRepository folderShareRepository;
    private final CurrentUserService currentUserService;
    private final RolePolicyService rolePolicyService;

    @Transactional(readOnly = true)
    public Folder getAccessibleFolder(Long folderId) {
        User currentUser = currentUserService.getCurrentUser();
        return getAccessibleFolder(currentUser, folderId);
    }

    @Transactional(readOnly = true)
    public Folder getAccessibleFolder(User user, Long folderId) {
        Folder folder = getFolderOrThrow(folderId);

        if (!canViewFolder(user, folder)) {
            throw new ForbiddenException("You do not have permission to access this folder");
        }

        return folder;
    }

    @Transactional(readOnly = true)
    public boolean canViewFolder(User user, Folder folder) {
        if (user == null || folder == null) {
            return false;
        }

        if (rolePolicyService.isManagementAccount(user)) {
            return true;
        }

        if (isOwner(user, folder)) {
            return true;
        }

        return folderShareRepository.hasActiveNonExpiredShare(folder.getId(), user.getId());
    }

    @Transactional(readOnly = true)
    public boolean canDownloadFolderContent(User user, Folder folder) {
        if (user == null || folder == null) {
            return false;
        }

        if (rolePolicyService.isManagementAccount(user)) {
            return true;
        }

        if (isOwner(user, folder)) {
            return true;
        }

        return folderShareRepository.hasActiveNonExpiredShareWithPermission(
                folder.getId(),
                user.getId(),
                DocumentSharePermission.DOWNLOAD
        );
    }

    public boolean isOwner(User user, Folder folder) {
        return user != null
                && folder != null
                && folder.getUser() != null
                && user.getId().equals(folder.getUser().getId());
    }

    private Folder getFolderOrThrow(Long folderId) {
        return folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found with id: " + folderId));
    }
}
