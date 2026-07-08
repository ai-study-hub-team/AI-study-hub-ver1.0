package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.DocumentSharePermission;
import com.aistudyhub.backend.entity.FolderShare;
import com.aistudyhub.backend.entity.FolderShareStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface FolderShareRepository extends JpaRepository<FolderShare, Long> {

    Optional<FolderShare> findByFolderIdAndSharedWithId(Long folderId, Long sharedWithUserId);

    List<FolderShare> findByFolderIdAndStatus(Long folderId, FolderShareStatus status);


    @Query("""
            select fs
            from FolderShare fs
            join fetch fs.folder f
            join fetch fs.owner o
            where fs.sharedWith.id = :userId
              and fs.status = com.aistudyhub.backend.entity.FolderShareStatus.ACTIVE
              and (fs.expiresAt is null or fs.expiresAt > :now)
            order by fs.createdAt desc
            """)
    List<FolderShare> findActiveNonExpiredBySharedWithUserId(
            @Param("userId") Long userId,
            @Param("now") LocalDateTime now
    );

    @Query("""
            select case when count(fs) > 0 then true else false end
            from FolderShare fs
            where fs.folder.id = :folderId
              and fs.sharedWith.id = :userId
              and fs.status = com.aistudyhub.backend.entity.FolderShareStatus.ACTIVE
              and (fs.expiresAt is null or fs.expiresAt > CURRENT_TIMESTAMP)
            """)
    boolean hasActiveNonExpiredShare(
            @Param("folderId") Long folderId,
            @Param("userId") Long userId
    );

    @Query("""
            select case when count(fs) > 0 then true else false end
            from FolderShare fs
            where fs.folder.id = :folderId
              and fs.sharedWith.id = :userId
              and fs.status = com.aistudyhub.backend.entity.FolderShareStatus.ACTIVE
              and fs.permission = :permission
              and (fs.expiresAt is null or fs.expiresAt > CURRENT_TIMESTAMP)
            """)
    boolean hasActiveNonExpiredShareWithPermission(
            @Param("folderId") Long folderId,
            @Param("userId") Long userId,
            @Param("permission") DocumentSharePermission permission
    );
}
