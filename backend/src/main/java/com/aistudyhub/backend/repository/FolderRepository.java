package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.Folder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FolderRepository extends JpaRepository<Folder, Long> {

    /** All root-level folders (no parent) belonging to a user. */
    List<Folder> findByUserIdAndParentFolderIsNull(Long userId);

    /** All folders belonging to a user (root + nested). */
    List<Folder> findByUserId(Long userId);

    /** Find a specific folder that belongs to a user — used for ownership checks. */
    Optional<Folder> findByIdAndUserId(Long id, Long userId);

    /** Children of a parent folder scoped to a user. */
    List<Folder> findByParentFolderIdAndUserId(Long parentFolderId, Long userId);

    /** Check duplicate name under the same parent (null parent = root). */
    boolean existsByNameAndUserIdAndParentFolderIsNull(String name, Long userId);

    boolean existsByNameAndUserIdAndParentFolderId(String name, Long userId, Long parentFolderId);

    /** Count direct child folders — used for FolderResponse.childFolderCount. */
    long countByParentFolderIdAndUserId(Long parentFolderId, Long userId);
}
