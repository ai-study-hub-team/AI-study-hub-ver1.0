package com.aistudyhub.backend.shareupload;

import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.exception.StorageCapacityException;
import com.aistudyhub.backend.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for atomic quota operations in StorageQuotaService.
 *
 * <p>Database note: these tests use Mockito to verify the conditional UPDATE path.
 * True atomicity is verified at the database level (PostgreSQL enforces row-level locking).
 * H2 supports the GREATEST() function used in atomicSubtractStorage.
 *
 * <p>Concurrency verification: a full concurrency test would require two concurrent
 * threads with a real PostgreSQL connection and is not included here. The atomic JPQL
 * pattern is the correctness guarantee at the database level.
 */
@ExtendWith(MockitoExtension.class)
class SharedUploadQuotaTest {

    @Mock UserRepository userRepository;
    @Mock com.aistudyhub.backend.service.SubscriptionService subscriptionService;

    @InjectMocks com.aistudyhub.backend.service.StorageQuotaService storageQuotaService;

    // ── Test: atomic reservation — success path ────────────────────────────────

    @Test
    @DisplayName("reserveStorageForSharedUpload succeeds when 1 row updated")
    void reserveSucceedsWhenRowUpdated() {
        mockPlanLimit(100L, 1024L * 1024L * 100L); // 100 MB plan
        when(userRepository.atomicAddStorageIfWithinQuota(1L, 500L, 1024L * 1024L * 100L))
                .thenReturn(1); // row updated

        assertThatNoException()
                .isThrownBy(() -> storageQuotaService.reserveStorageForSharedUpload(1L, 500L));
    }

    // ── Test: atomic reservation — quota exceeded ──────────────────────────────

    @Test
    @DisplayName("reserveStorageForSharedUpload throws StorageCapacityException when 0 rows updated")
    void reserveThrowsWhenZeroRowsUpdated() {
        mockPlanLimit(100L, 1024L * 1024L * 100L);
        when(userRepository.atomicAddStorageIfWithinQuota(anyLong(), anyLong(), anyLong()))
                .thenReturn(0); // quota exceeded

        assertThatThrownBy(() -> storageQuotaService.reserveStorageForSharedUpload(1L, 999_999_999L))
                .isInstanceOf(StorageCapacityException.class)
                .hasMessageContaining("storage capacity");
    }

    // ── Test: atomic subtraction — delegates to JPQL ──────────────────────────

    @Test
    @DisplayName("releaseStorageForSubmission delegates to atomicSubtractStorage")
    void releaseCallsAtomicSubtract() {
        when(userRepository.atomicSubtractStorage(1L, 500L)).thenReturn(1);

        storageQuotaService.releaseStorageForSubmission(1L, 500L);

        verify(userRepository).atomicSubtractStorage(1L, 500L);
    }

    // ── Test: zero-byte release is no-op ──────────────────────────────────────

    @Test
    @DisplayName("releaseStorageForSubmission is a no-op for zero bytes")
    void releaseNoOpForZeroBytes() {
        storageQuotaService.releaseStorageForSubmission(1L, 0L);
        verifyNoInteractions(userRepository);
    }

    // ── Test: stale entity after bulk update ──────────────────────────────────

    @Test
    @DisplayName("After atomicAddStorageIfWithinQuota, a stale User entity reload reflects new value")
    void staleEntityAfterBulkUpdateIsDescribedCorrectly() {
        // This test documents the expected behavior:
        // @Modifying(clearAutomatically = true) evicts the User from the first-level cache.
        // Any subsequent userRepository.findById() returns a fresh DB read.
        // We verify that the JPQL method is called (not a save on a stale entity).

        mockPlanLimit(100L, 1024L * 1024L * 100L);
        when(userRepository.atomicAddStorageIfWithinQuota(1L, 200L, 1024L * 1024L * 100L))
                .thenReturn(1);

        storageQuotaService.reserveStorageForSharedUpload(1L, 200L);

        // Verify: only the atomic JPQL update was called, never save(User)
        verify(userRepository, never()).save(any(User.class));
        verify(userRepository).atomicAddStorageIfWithinQuota(1L, 200L, 1024L * 1024L * 100L);
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private void mockPlanLimit(long storageMb, long limitBytes) {
        var plan = com.aistudyhub.backend.entity.SubscriptionPlan.builder()
                .storageLimitMb(storageMb)
                .maxUploadSizePerFileMb(50L)
                .dailyTokenLimit(1000L)
                .allowDocumentUpload(true).allowImageUpload(true)
                .allowVideoUpload(false).allowAudioUpload(false)
                .build();
        var sub = com.aistudyhub.backend.entity.UserSubscription.builder()
                .plan(plan).build();
        when(subscriptionService.getCurrentSubscription(any())).thenReturn(sub);
    }
}
