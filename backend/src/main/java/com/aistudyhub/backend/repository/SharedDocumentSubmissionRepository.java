package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.SharedDocumentSubmission;
import com.aistudyhub.backend.entity.SharedSubmissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SharedDocumentSubmissionRepository extends JpaRepository<SharedDocumentSubmission, Long> {

    /** All submissions owned by User A (any status), newest first. */
    List<SharedDocumentSubmission> findByOwnerUserIdOrderBySubmittedAtDesc(Long ownerUserId);

    /** Submissions for User A filtered by status. */
    List<SharedDocumentSubmission> findByOwnerUserIdAndStatusOrderBySubmittedAtDesc(
            Long ownerUserId, SharedSubmissionStatus status);

    /** Ownership check: a specific submission that belongs to User A. */
    Optional<SharedDocumentSubmission> findByIdAndOwnerUserId(Long id, Long ownerUserId);

    /** All submissions for a specific share link. */
    List<SharedDocumentSubmission> findByShareLinkId(Long shareLinkId);

    /**
     * Find all PENDING_REVIEW submissions whose 30-day retention window has expired.
     * Used exclusively by {@code SharedSubmissionCleanupScheduler}.
     * Only matches rows where:
     *   status = PENDING_REVIEW
     *   AND deleteAfter IS NOT NULL
     *   AND deleteAfter <= :now
     */
    @Query("SELECT s FROM SharedDocumentSubmission s " +
           "WHERE s.status = com.aistudyhub.backend.entity.SharedSubmissionStatus.PENDING_REVIEW " +
           "AND s.deleteAfter IS NOT NULL " +
           "AND s.deleteAfter <= :now")
    List<SharedDocumentSubmission> findExpiredPendingSubmissions(@Param("now") LocalDateTime now);
}
