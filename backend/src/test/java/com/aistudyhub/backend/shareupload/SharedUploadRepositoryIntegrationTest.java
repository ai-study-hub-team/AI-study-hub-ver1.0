package com.aistudyhub.backend.shareupload;

import com.aistudyhub.backend.entity.SharedDocumentSubmission;
import com.aistudyhub.backend.entity.SharedSubmissionStatus;
import com.aistudyhub.backend.entity.DocumentShareLink;
import com.aistudyhub.backend.entity.DocumentShareStatus;
import com.aistudyhub.backend.entity.ShareLinkAccessPolicy;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.repository.SharedDocumentSubmissionRepository;
import com.aistudyhub.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;

/**
 * Integration test validating atomic database queries on a real database.
 * Ensures COALESCE, GREATEST, and atomic claims work as intended.
 */
@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
public class SharedUploadRepositoryIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SharedDocumentSubmissionRepository submissionRepository;

    @Autowired
    private TestEntityManager entityManager;

    private User owner;
    private DocumentShareLink shareLink;

    @BeforeEach
    void setUp() {
        owner = User.builder()
                .fullName("Test Owner")
                .email("testowner@example.com")
                .password("password")
                .totalStorageUsedBytes(100L) // Start with 100 bytes
                .build();
        owner = entityManager.persistAndFlush(owner);
        shareLink = entityManager.persistAndFlush(DocumentShareLink.builder()
                .owner(owner)
                .tokenHash("integration-test-link-" + System.nanoTime())
                .status(DocumentShareStatus.ACTIVE)
                .accessPolicy(ShareLinkAccessPolicy.ANY_AUTHENTICATED_USER)
                .build());
    }

    @Test
    @DisplayName("atomicSubtractStorage ensures quota never drops below zero")
    void atomicSubtractStorage_DoesNotGoBelowZero() {
        // Subtract 50 bytes (within bounds)
        int updatedRows = userRepository.atomicSubtractStorage(owner.getId(), 50L);
        entityManager.clear();
        assertThat(updatedRows).isEqualTo(1);
        
        User updatedUser = userRepository.findById(owner.getId()).get();
        assertThat(updatedUser.getTotalStorageUsedBytes()).isEqualTo(50L);

        // Subtract 200 bytes (exceeds current 50 bytes)
        userRepository.atomicSubtractStorage(owner.getId(), 200L);
        entityManager.clear();
        
        updatedUser = userRepository.findById(owner.getId()).get();
        // GREATEST(0, ...) must prevent negative bounds
        assertThat(updatedUser.getTotalStorageUsedBytes()).isEqualTo(0L);
    }

    @Test
    @DisplayName("atomicAddStorageIfWithinQuota enforces bounds concurrently")
    void atomicAddStorageIfWithinQuota_EnforcesBounds() {
        // Add 50 bytes (limit 200) -> success
        int updated = userRepository.atomicAddStorageIfWithinQuota(owner.getId(), 50L, 200L);
        assertThat(updated).isEqualTo(1);
        
        // Add 100 bytes (limit 200) -> 100 + 50 + 100 = 250 > 200 -> FAIL
        updated = userRepository.atomicAddStorageIfWithinQuota(owner.getId(), 100L, 200L);
        assertThat(updated).isEqualTo(0); // 0 rows updated
        
        entityManager.clear();
        User updatedUser = userRepository.findById(owner.getId()).get();
        assertThat(updatedUser.getTotalStorageUsedBytes()).isEqualTo(150L); // 100 + 50
    }

    @Test
    @DisplayName("atomicClaimQuotaRelease ensures idempotent quota release")
    void atomicClaimQuotaRelease_IsIdempotent() {
        SharedDocumentSubmission submission = SharedDocumentSubmission.builder()
                .shareLink(shareLink)
                .ownerUserId(owner.getId())
                .uploaderUserId(owner.getId())
                .status(SharedSubmissionStatus.PENDING_REVIEW)
                .quotaReleasedAt(null)
                .submittedAt(LocalDateTime.now())
                .build();
        submission = entityManager.persistAndFlush(submission);

        // First thread/worker claims the release
        int claimed = submissionRepository.atomicClaimQuotaRelease(submission.getId());
        assertThat(claimed).isEqualTo(1);
        
        // Second thread/worker attempts to claim
        int secondClaim = submissionRepository.atomicClaimQuotaRelease(submission.getId());
        assertThat(secondClaim).isEqualTo(0); // Cannot claim twice
        
        entityManager.clear();
        SharedDocumentSubmission reloaded = submissionRepository.findById(submission.getId()).get();
        assertThat(reloaded.getQuotaReleasedAt()).isNotNull();
    }

    @Test
    @DisplayName("owner-scoped submission lookup fetches share link and owner for rejection")
    void ownerScopedLookupFetchesShareLinkAndOwner() {
        SharedDocumentSubmission submission = entityManager.persistAndFlush(
                SharedDocumentSubmission.builder()
                        .shareLink(shareLink)
                        .ownerUserId(owner.getId())
                        .uploaderUserId(owner.getId())
                        .status(SharedSubmissionStatus.PENDING_REVIEW)
                        .build());

        SharedDocumentSubmission loaded = submissionRepository
                .findByIdAndOwnerUserId(submission.getId(), owner.getId())
                .orElseThrow();
        entityManager.clear();

        assertThat(loaded.getShareLink().getOwner().getId()).isEqualTo(owner.getId());
    }

    @Test
    @DisplayName("non-owner cannot load a submission for rejection")
    void ownerScopedLookupRejectsNonOwner() {
        User otherUser = entityManager.persistAndFlush(User.builder()
                .fullName("Other User")
                .email("other@example.com")
                .password("password")
                .build());
        SharedDocumentSubmission submission = entityManager.persistAndFlush(
                SharedDocumentSubmission.builder()
                        .shareLink(shareLink)
                        .ownerUserId(owner.getId())
                        .uploaderUserId(owner.getId())
                        .status(SharedSubmissionStatus.PENDING_REVIEW)
                        .build());

        assertThat(submissionRepository.findByIdAndOwnerUserId(submission.getId(), otherUser.getId()))
                .isEmpty();
    }
}
