package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.DocumentShare;
import com.aistudyhub.backend.entity.DocumentSharePermission;
import com.aistudyhub.backend.entity.DocumentShareStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentShareRepository extends JpaRepository<DocumentShare, Long> {

    boolean existsByDocumentIdAndSharedWithId(Long documentId, Long sharedWithUserId);

    boolean existsByDocumentIdAndSharedWithIdAndStatus(
            Long documentId,
            Long sharedWithUserId,
            DocumentShareStatus status
    );

    Optional<DocumentShare> findByDocumentIdAndSharedWithId(
            Long documentId,
            Long sharedWithUserId
    );

    List<DocumentShare> findByDocumentIdAndStatus(
            Long documentId,
            DocumentShareStatus status
    );

    @Modifying
    @Query("""
            update DocumentShare s
            set s.status = com.aistudyhub.backend.entity.DocumentShareStatus.REVOKED
            where s.document.id = :documentId
              and s.sharedWith.id = :userId
            """)
    int revokeByDocumentIdAndUserId(
            @Param("documentId") Long documentId,
            @Param("userId") Long userId
    );

    @Query("""
            select case when count(s) > 0 then true else false end
            from DocumentShare s
            where s.document.id = :documentId
              and s.sharedWith.id = :userId
              and s.status = com.aistudyhub.backend.entity.DocumentShareStatus.ACTIVE
              and (s.expiresAt is null or s.expiresAt > CURRENT_TIMESTAMP)
            """)
    boolean hasActiveNonExpiredShare(
            @Param("documentId") Long documentId,
            @Param("userId") Long userId
    );

    @Query("""
        select count(ds) > 0
        from DocumentShare ds
        where ds.document.id = :documentId
          and ds.sharedWith.id = :userId
          and ds.status = com.aistudyhub.backend.entity.DocumentShareStatus.ACTIVE
          and ds.permission = :permission
          and (ds.expiresAt is null or ds.expiresAt > CURRENT_TIMESTAMP)
        """)
    boolean hasActiveNonExpiredShareWithPermission(
            @Param("documentId") Long documentId,
            @Param("userId") Long userId,
            @Param("permission") DocumentSharePermission permission
    );

}
