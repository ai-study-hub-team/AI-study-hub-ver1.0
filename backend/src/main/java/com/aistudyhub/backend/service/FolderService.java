package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.request.FolderCreateRequest;
import com.aistudyhub.backend.dto.request.FolderUpdateRequest;
import com.aistudyhub.backend.dto.response.FolderResponse;
import com.aistudyhub.backend.entity.Folder;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.exception.NotFoundException;
import com.aistudyhub.backend.repository.DocumentRepository;
import com.aistudyhub.backend.repository.FolderRepository;
import com.aistudyhub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FolderService {

    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final CurrentUserService currentUserService;

    // ─── Create ────────────────────────────────────────────────────────────────

    @Transactional
    public FolderResponse createFolder(FolderCreateRequest request) {
        User user = currentUserService.getCurrentUser();


        // Resolve optional parent folder — must belong to the same user
        Folder parentFolder = null;
        if (request.getParentFolderId() != null) {
            parentFolder = folderRepository.findByIdAndUserId(
                            request.getParentFolderId(), user.getId())
                    .orElseThrow(() -> new NotFoundException("Parent folder not found"));
        }

        // Duplicate name check under the same parent
        checkDuplicateName(request.getName().trim(), user.getId(), request.getParentFolderId(), null);

        LocalDateTime now = LocalDateTime.now();
        Folder folder = Folder.builder()
                .name(request.getName().trim())
                .description(request.getDescription())
                .user(user)
                .parentFolder(parentFolder)
                .createdAt(now)
                .updatedAt(now)
                .build();

        return toResponse(folderRepository.save(folder));
    }

    // ─── Read All (for a user) ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<FolderResponse> getFoldersByUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new RuntimeException("User not found with id: " + userId);
        }
        return folderRepository.findByUserId(userId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─── Read One ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public FolderResponse getFolderById(Long id, Long userId) {
        Folder folder = folderRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException(
                        "Folder not found with id: " + id + " for user: " + userId));
        return toResponse(folder);
    }

    // ─── Update ────────────────────────────────────────────────────────────────

    @Transactional
    public FolderResponse updateFolder(Long id, FolderUpdateRequest request) {
        Folder folder = folderRepository.findByIdAndUserId(id, request.getUserId())
                .orElseThrow(() -> new RuntimeException(
                        "Folder not found with id: " + id + " for user: " + request.getUserId()));

        // A folder cannot be its own parent
        if (request.getParentFolderId() != null
                && request.getParentFolderId().equals(id)) {
            throw new RuntimeException("A folder cannot be its own parent.");
        }

        // Resolve new parent — must belong to the same user
        Folder newParent = null;
        if (request.getParentFolderId() != null) {
            newParent = folderRepository.findByIdAndUserId(
                    request.getParentFolderId(), request.getUserId())
                    .orElseThrow(() -> new RuntimeException(
                            "Parent folder not found or does not belong to user: "
                                    + request.getParentFolderId()));

            // Basic circular-nesting guard: the new parent must not already
            // be a descendant of this folder
            if (isDescendant(newParent, id)) {
                throw new RuntimeException(
                        "Cannot set a descendant folder as the parent (circular nesting).");
            }
        }

        // Duplicate name check (exclude current folder)
        Long currentParentId = folder.getParentFolder() != null
                ? folder.getParentFolder().getId() : null;
        Long targetParentId = request.getParentFolderId();
        boolean nameChanged = !folder.getName().equalsIgnoreCase(request.getName().trim());
        boolean parentChanged = !java.util.Objects.equals(currentParentId, targetParentId);
        if (nameChanged || parentChanged) {
            checkDuplicateName(request.getName().trim(), request.getUserId(), targetParentId, id);
        }

        folder.setName(request.getName().trim());
        folder.setDescription(request.getDescription());
        folder.setParentFolder(newParent);
        folder.setUpdatedAt(LocalDateTime.now());

        Folder saved = folderRepository.save(folder);
        log.info("[Folder] Updated folder id={}, name='{}', userId={}, newParentId={}",
                saved.getId(), saved.getName(), request.getUserId(), request.getParentFolderId());
        return toResponse(saved);
    }

    // ─── Delete ────────────────────────────────────────────────────────────────

    /**
     * Deletes a folder.
     * Documents inside the folder are moved back to root (folder_id = null)
     * before deletion so no FK violation occurs.
     * Child sub-folders are also un-parented (moved to root level).
     */
    @Transactional
    public void deleteFolder(Long id, Long userId) {
        Folder folder = folderRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException(
                        "Folder not found with id: " + id + " for user: " + userId));

        // Move child folders to root so they are not deleted with the parent
        List<Folder> children = folderRepository.findByParentFolderIdAndUserId(id, userId);
        for (Folder child : children) {
            child.setParentFolder(null);
            child.setUpdatedAt(LocalDateTime.now());
        }
        if (!children.isEmpty()) {
            folderRepository.saveAll(children);
            log.info("[Folder] Moved {} child folder(s) to root before deleting folder id={}",
                    children.size(), id);
        }

        // Move documents in this folder back to root
        int moved = documentRepository.clearFolderForDocumentsInFolder(id);
        if (moved > 0) {
            log.info("[Folder] Moved {} document(s) to root before deleting folder id={}", moved, id);
        }

        folderRepository.delete(folder);
        log.info("[Folder] Deleted folder id={}, userId={}", id, userId);
    }

    // ─── Mapper ────────────────────────────────────────────────────────────────

    public FolderResponse toResponse(Folder folder) {
        Long parentId = folder.getParentFolder() != null
                ? folder.getParentFolder().getId() : null;
        String parentName = folder.getParentFolder() != null
                ? folder.getParentFolder().getName() : null;

        // Document count: documents directly in this folder (ACTIVE, any processStatus)
        long docCount = documentRepository.countByFolderIdAndStatusNot(
                folder.getId(),
                com.aistudyhub.backend.entity.DocumentStatus.DELETED);

        // Child folder count
        long childCount = folderRepository.countByParentFolderIdAndUserId(
                folder.getId(), folder.getUser().getId());

        return FolderResponse.builder()
                .id(folder.getId())
                .name(folder.getName())
                .description(folder.getDescription())
                .userId(folder.getUser().getId())
                .parentFolderId(parentId)
                .parentFolderName(parentName)
                .documentCount(docCount)
                .childFolderCount(childCount)
                .createdAt(folder.getCreatedAt())
                .updatedAt(folder.getUpdatedAt())
                .build();
    }

    // ─── Private helpers ───────────────────────────────────────────────────────

    /**
     * Checks whether a proposed name is already taken under the same parent.
     *
     * @param excludeFolderId folder ID to exclude from the check (for updates);
     *                        {@code null} for new folders.
     */
    private void checkDuplicateName(String name, Long userId,
                                    Long parentFolderId, Long excludeFolderId) {
        List<Folder> siblings;
        if (parentFolderId == null) {
            siblings = folderRepository.findByUserId(userId).stream()
                    .filter(f -> f.getParentFolder() == null)
                    .collect(Collectors.toList());
        } else {
            siblings = folderRepository.findByParentFolderIdAndUserId(parentFolderId, userId);
        }

        boolean duplicate = siblings.stream()
                .filter(f -> !f.getId().equals(excludeFolderId))
                .anyMatch(f -> f.getName().equalsIgnoreCase(name));

        if (duplicate) {
            throw new RuntimeException(
                    "A folder named '" + name + "' already exists in this location.");
        }
    }

    /**
     * Returns {@code true} if {@code candidate} is a descendant of the folder
     * identified by {@code ancestorId}.
     * Walks up the parent chain — guards against circular nesting.
     */
    private boolean isDescendant(Folder candidate, Long ancestorId) {
        Folder current = candidate;
        // Max depth guard to prevent infinite loops on pre-existing bad data
        int depth = 0;
        while (current.getParentFolder() != null && depth < 50) {
            if (current.getParentFolder().getId().equals(ancestorId)) {
                return true;
            }
            current = current.getParentFolder();
            depth++;
        }
        return false;
    }
}
