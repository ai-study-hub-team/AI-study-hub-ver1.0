package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.SharedDocumentSubmission;
import com.aistudyhub.backend.entity.SharedSubmissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SharedDocumentSubmissionRepository
        extends JpaRepository<SharedDocumentSubmission, Long> {

    List<SharedDocumentSubmission> findByOwnerUserIdAndDeletedAtIsNullOrderBySubmittedAtDesc(Long ownerUserId);

    List<SharedDocumentSubmission> findByOwnerUserIdAndStatusAndDeletedAtIsNullOrderBySubmittedAtDesc(
            Long ownerUserId, SharedSubmissionStatus status);

    @Query("""
            SELECT s FROM SharedDocumentSubmission s
            JOIN FETCH s.shareLink link
            JOIN FETCH link.owner owner
            WHERE s.id = :submissionId
              AND owner.id = :ownerUserId
              AND s.deletedAt IS NULL
            """)
    Optional<SharedDocumentSubmission> findByIdAndOwnerUserId(
            @Param("submissionId") Long submissionId,
            @Param("ownerUserId") Long ownerUserId
    );

    List<SharedDocumentSubmission> findByShareLinkId(Long shareLinkId);

    List<SharedDocumentSubmission> findByShareLinkIdAndDeletedAtIsNull(Long shareLinkId);

    boolean existsByShareLinkId(Long shareLinkId);

    @Query("""
            SELECT COUNT(s) FROM SharedDocumentSubmission s
            WHERE s.shareLink.id = :shareLinkId
              AND s.uploaderUserId = :uploaderUserId
            """)
    long countByShareLinkIdAndUploaderUserId(
            @Param("shareLinkId") Long shareLinkId,
            @Param("uploaderUserId") Long uploaderUserId
    );

    /** Expired PENDING_REVIEW submissions whose cloud object must be deleted. */
    @Query("""
            SELECT s FROM SharedDocumentSubmission s
            WHERE s.status = com.aistudyhub.backend.entity.SharedSubmissionStatus.PENDING_REVIEW
              AND s.deleteAfter IS NOT NULL
              AND s.deleteAfter <= :now
            """)
    List<SharedDocumentSubmission> findExpiredPendingSubmissions(@Param("now") LocalDateTime now);

    /**
     * Submissions where a previous Cloudinary deletion attempt failed and must be retried.
     * The cloudDeleteFailedId is non-null when a retry is needed.
     */
    @Query("""
            SELECT s FROM SharedDocumentSubmission s
            WHERE s.cloudDeleteFailedId IS NOT NULL
              AND s.status != com.aistudyhub.backend.entity.SharedSubmissionStatus.APPROVED
            """)
    List<SharedDocumentSubmission> findSubmissionsWithFailedCloudDeletion();

    /**
     * Atomically claims the right to release quota by setting quotaReleasedAt to CURRENT_TIMESTAMP
     * IF it is currently NULL.
     * Returns 1 if the claim was successful, 0 if another worker already claimed it.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE SharedDocumentSubmission s
            SET s.quotaReleasedAt = CURRENT_TIMESTAMP
            WHERE s.id = :id AND s.quotaReleasedAt IS NULL
            """)
    int atomicClaimQuotaRelease(@Param("id") Long id);
}
