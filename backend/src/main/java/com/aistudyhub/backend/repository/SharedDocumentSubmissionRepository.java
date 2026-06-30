package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.SharedDocumentSubmission;
import com.aistudyhub.backend.entity.SharedSubmissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

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
}
