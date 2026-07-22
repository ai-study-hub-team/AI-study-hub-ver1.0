package com.aistudyhub.backend.service;

import com.aistudyhub.backend.entity.SubscriptionPlan;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.entity.UserSubscription;
import com.aistudyhub.backend.exception.FileTooLargeException;
import com.aistudyhub.backend.exception.PlanRestrictionException;
import com.aistudyhub.backend.exception.QuotaExceededException;
import com.aistudyhub.backend.exception.StorageCapacityException;
import com.aistudyhub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Manages storage quota for users.
 *
 * <h3>Concurrency model</h3>
 * All additions and subtractions of {@code totalStorageUsedBytes} are executed as
 * JPQL bulk updates (see {@link UserRepository#atomicAddStorageIfWithinQuota} and
 * {@link UserRepository#atomicSubtractStorage}).  These bypass the JPA first-level cache,
 * so every method is annotated with {@code @Modifying(clearAutomatically = true)} in the
 * repository to prevent stale managed entities from overwriting the updated counter.
 *
 * <h3>Rule: never call userRepository.save(user) to change quota</h3>
 * Callers outside this service must NOT set {@code user.setTotalStorageUsedBytes()} and
 * save the entity directly; that pattern would silently overwrite a quota value that was
 * already updated atomically by another request.
 *
 * <h3>Quota release idempotency</h3>
 * The caller is responsible for checking {@code submission.getQuotaReleasedAt()} before
 * calling {@link #releaseStorageForSubmission}.  This service itself does not check the
 * idempotency marker — it is the caller's duty to ensure the guard is in place.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StorageQuotaService {

    private final SubscriptionService subscriptionService;
    private final UserRepository userRepository;

    // ─── Read-only validation (used before upload) ─────────────────────────────

    /**
     * Validates that the owner's subscription plan allows the given MIME type.
     *
     * @throws PlanRestrictionException if the file type is not allowed on the owner's plan.
     */
    @Transactional(readOnly = true)
    public void validateFileRestrictions(Long userId, String mimeType) {
        if (mimeType == null) return;
        SubscriptionPlan plan = getActivePlan(userId);
        String lc = mimeType.toLowerCase();

        if (lc.startsWith("video/") && !plan.getAllowVideoUpload()) {
            throw new PlanRestrictionException("Video uploads are not allowed on your current plan.");
        }
        if (lc.startsWith("audio/") && !plan.getAllowAudioUpload()) {
            throw new PlanRestrictionException("Audio uploads are not allowed on your current plan.");
        }
        if (lc.startsWith("image/") && !plan.getAllowImageUpload()) {
            throw new PlanRestrictionException("Image uploads are not allowed on your current plan.");
        }
        boolean isDocument = lc.equals("application/pdf")
                || lc.equals("application/msword")
                || lc.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                || lc.equals("text/plain")
                || lc.startsWith("application/vnd.ms-");
        if (isDocument && !plan.getAllowDocumentUpload()) {
            throw new PlanRestrictionException("Document uploads are not allowed on your current plan.");
        }
    }

    /**
     * Validates that the file does not exceed the plan-level per-file size limit.
     *
     * @throws QuotaExceededException if the file is too large for the plan.
     */
    @Transactional(readOnly = true)
    public void validateFileSize(Long userId, Long fileSizeBytes) {
        SubscriptionPlan plan = getActivePlan(userId);
        long limitBytes = plan.getMaxUploadSizePerFileMb() * 1024L * 1024L;
        if (fileSizeBytes > limitBytes) {
            throw new QuotaExceededException(
                    "File size exceeds the maximum allowed size of "
                            + plan.getMaxUploadSizePerFileMb() + " MB for your plan.");
        }
    }

    /**
     * Returns the plan-level per-file size limit in bytes.
     * Used to compute the effective limit when a share link does not specify one.
     */
    @Transactional(readOnly = true)
    public long getPlanFileSizeLimitBytes(Long userId) {
        SubscriptionPlan plan = getActivePlan(userId);
        return plan.getMaxUploadSizePerFileMb() * 1024L * 1024L;
    }

    /**
     * Returns the plan-level total storage limit in bytes.
     */
    @Transactional(readOnly = true)
    public long getPlanStorageLimitBytes(Long userId) {
        SubscriptionPlan plan = getActivePlan(userId);
        return plan.getStorageLimitMb() * 1024L * 1024L;
    }

    // ─── Legacy non-atomic methods (for direct uploads, not shared submissions) ──
    //
    // These are retained for backward compatibility with the direct document upload flow.
    // They are safe for single-threaded or low-concurrency scenarios.  For shared
    // submissions, the atomic methods below must be used instead.

    /**
     * @deprecated for shared submissions use {@link #reserveStorageForSharedUpload} instead.
     */
    @Transactional(readOnly = true)
    public void validateStorageLimit(Long userId, Long newFileBytes) {
        long limit = getPlanStorageLimitBytes(userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        long current = user.getTotalStorageUsedBytes() != null ? user.getTotalStorageUsedBytes() : 0L;
        if (current + newFileBytes > limit) {
            throw new QuotaExceededException(
                    "Storage quota exceeded. Current usage plus new file exceeds the plan limit.");
        }
    }

    /**
     * Non-atomic add used by the direct upload path.
     *
     * @deprecated for shared submissions use {@link #reserveStorageForSharedUpload} instead.
     */
    @Transactional
    public void addStorageUsage(Long userId, Long uploadedBytes) {
        if (uploadedBytes == null || uploadedBytes <= 0) return;
        userRepository.atomicAddStorage(userId, uploadedBytes);
        log.info("[Quota] Added {}B for userId={} (atomically)", uploadedBytes, userId);
    }

    /**
     * Non-atomic subtract used by the direct deletion path.
     *
     * @deprecated for shared submissions use {@link #releaseStorageForSubmission} instead.
     */
    @Transactional
    public void subtractStorageUsage(Long userId, Long removedBytes) {
        if (removedBytes == null || removedBytes <= 0) return;
        int rows = userRepository.atomicSubtractStorage(userId, removedBytes);
        if (rows > 0) {
            log.info("[Quota] Subtracted {}B from userId={}", removedBytes, userId);
        } else {
            log.warn("[Quota] User {} not found for subtraction", userId);
        }
    }

    // ─── Atomic shared-submission quota operations ─────────────────────────────

    /**
     * Atomically reserves storage for a new shared submission.
     *
     * <p>Executes a single conditional database UPDATE:
     * <pre>
     * UPDATE users
     * SET    total_storage_used_bytes = total_storage_used_bytes + :bytes
     * WHERE  id = :ownerId
     *   AND  (total_storage_used_bytes + :bytes) <= :quotaLimit
     * </pre>
     *
     * <p>If zero rows are updated, the owner is at or over quota and this method throws
     * {@link StorageCapacityException}.  The caller must NOT write any file to disk
     * before calling this method — reserve first, then write.
     *
     * <p>After a successful reservation, any managed {@code User} entity in the current
     * session reflects stale data.  Do NOT call {@code userRepository.save(user)} with
     * quota-related fields after this call.
     *
     * @param ownerId the user whose quota is being charged
     * @param bytes   the exact number of bytes to reserve (server-verified, not client-reported)
     * @throws StorageCapacityException if the owner does not have enough remaining quota
     */
    @Transactional
    public void reserveStorageForSharedUpload(Long ownerId, long bytes) {
        long quotaLimitBytes = getPlanStorageLimitBytes(ownerId);
        int updated = userRepository.atomicAddStorageIfWithinQuota(ownerId, bytes, quotaLimitBytes);
        if (updated == 0) {
            log.warn("[Quota] Reservation denied for ownerId={}: {} bytes would exceed quota limit {}B",
                    ownerId, bytes, quotaLimitBytes);
            throw new StorageCapacityException(
                    "The link owner does not currently have enough storage capacity to accept this file.");
        }
        log.info("[Quota] Reserved {}B for ownerId={} (atomically)", bytes, ownerId);
    }

    /**
     * Releases storage that was previously reserved for a staged submission.
     *
     * <p>This must ONLY be called after the staged file has been confirmed deleted.
     * The caller is responsible for checking {@code quotaReleasedAt} to prevent double release.
     *
     * <p>Uses the safe atomic subtract: the counter will never go below zero.
     *
     * @param ownerId the user whose quota was charged
     * @param bytes   the bytes to release (must equal the original {@code quotaChargedBytes})
     */
    @Transactional
    public void releaseStorageForSubmission(Long ownerId, long bytes) {
        if (bytes <= 0) return;
        int rows = userRepository.atomicSubtractStorage(ownerId, bytes);
        if (rows > 0) {
            log.info("[Quota] Released {}B for ownerId={} (atomically)", bytes, ownerId);
        } else {
            log.warn("[Quota] Owner {} not found for quota release", ownerId);
        }
    }

    // ─── Helper ────────────────────────────────────────────────────────────────

    private SubscriptionPlan getActivePlan(Long userId) {
        UserSubscription subscription = subscriptionService.getCurrentSubscription(userId);
        return subscription.getPlan();
    }
}
