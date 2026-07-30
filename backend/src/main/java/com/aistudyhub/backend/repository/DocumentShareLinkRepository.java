package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.DocumentShareLink;
import com.aistudyhub.backend.entity.DocumentShareStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentShareLinkRepository extends JpaRepository<DocumentShareLink, Long> {

    /** Look up a link by its hashed token — used to validate public URLs. */
    Optional<DocumentShareLink> findByTokenHash(String tokenHash);

    /** All share links created by a user (any status). */
    List<DocumentShareLink> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    /** Active links only for a given user. */
    List<DocumentShareLink> findByOwnerIdAndStatus(Long ownerId, DocumentShareStatus status);

    /** Active links whose configured expiry time has passed. */
    List<DocumentShareLink> findByStatusAndExpiresAtBefore(
            DocumentShareStatus status,
            java.time.LocalDateTime now);

    /** Ownership check: find a specific link that belongs to a user. */
    Optional<DocumentShareLink> findByIdAndOwnerId(Long id, Long ownerId);

    long countByOwnerIdAndCreatedAtGreaterThanEqual(Long ownerId, java.time.LocalDateTime startOfDay);

    @EntityGraph(attributePaths = "owner")
    @Query("""
            select link from DocumentShareLink link
            join link.owner owner
            where (:status is null or link.status = :status)
              and (lower(coalesce(link.title, '')) like :keywordPattern
                   or lower(owner.fullName) like :keywordPattern
                   or lower(owner.email) like :keywordPattern)
            """)
    Page<DocumentShareLink> searchForAdmin(
            @Param("status") DocumentShareStatus status,
            @Param("keywordPattern") String keywordPattern,
            Pageable pageable);
}
