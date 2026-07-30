package com.aistudyhub.backend.service;

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

@Service
@RequiredArgsConstructor
@Slf4j
public class StorageQuotaService {

    private final SubscriptionService subscriptionService;
    private final UserRepository userRepository;
    private final RolePolicyService rolePolicyService;


    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
    }

    @Transactional(readOnly = true)
    public long getPlanFileSizeLimitBytes(Long userId) {
        UserSubscription subscription = getActiveSubscription(userId);
        return subscription.getPlan().getMaxUploadSizePerFileMb() * 1024L * 1024L;
    }
    @Transactional(readOnly = true)
    public long getPlanStorageLimitBytes(Long userId) {
        UserSubscription subscription = getActiveSubscription(userId);
        return subscription.getPlan().getStorageLimitMb() * 1024L * 1024L;
    }

    // check dung lượng theo gói
    @Transactional(readOnly = true)
    public void validateStorageLimit(Long userId, Long newFileBytes) {
        if (hasManagementQuotaBypass(userId)) {
            return;
        }

        long limit = getPlanStorageLimitBytes(userId);

        User user = findUser(userId);

        long current =
                user.getTotalStorageUsedBytes() != null
                        ? user.getTotalStorageUsedBytes()
                        : 0L;

        if (current + newFileBytes > limit) {
            throw new QuotaExceededException(
                    "Storage quota exceeded. Current usage plus new file "
                            + "exceeds the plan limit."
            );
        }
    }

    /**
     * Atomic add used by the direct upload path.
     *
     * @deprecated for shared submissions use
     * {@link #reserveStorageForSharedUpload} instead.
     */
    @Transactional
    public void addStorageUsage(Long userId, Long uploadedBytes) {
        if (uploadedBytes == null || uploadedBytes <= 0) return;
        userRepository.atomicAddStorage(userId, uploadedBytes);
        log.info("[Quota] Added {}B for userId={} (atomically)", uploadedBytes, userId);
    }

    /**
     * Atomic subtract used by the direct deletion path.
     *
     * @deprecated for shared submissions use
     * {@link #releaseStorageForSubmission} instead.
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

    // check size file theo gói
    @Transactional(readOnly = true)
    public void validateFileSize(Long userId, Long fileSizeBytes) {
        if (hasManagementQuotaBypass(userId)) {
            return;
        }

        UserSubscription subscription = getActiveSubscription(userId);

        long limitBytes =
                subscription.getPlan().getMaxUploadSizePerFileMb() * 1024L * 1024L;

        if (fileSizeBytes > limitBytes) {
            throw new QuotaExceededException(
                    "File size exceeds the maximum allowed size of "
                            + subscription.getPlan().getMaxUploadSizePerFileMb()
                            + " MB for your plan."
            );
        }
    }

    @Transactional(readOnly = true)
    public void validateFileRestrictions(Long userId, String mimeType) {
        if (hasManagementQuotaBypass(userId)) {
            return;
        }

        if (mimeType == null) {
            return;
        }

        UserSubscription subscription = getActiveSubscription(userId);
        String lc = mimeType.toLowerCase();

        if (lc.startsWith("video/") && !subscription.getPlan().getAllowVideoUpload()) {
            throw new PlanRestrictionException(
                    "Video uploads are not allowed on your current plan."
            );
        }

        if (lc.startsWith("audio/") && !subscription.getPlan().getAllowAudioUpload()) {
            throw new PlanRestrictionException(
                    "Audio uploads are not allowed on your current plan."
            );
        }

        if (lc.startsWith("image/") && !subscription.getPlan().getAllowImageUpload()) {
            throw new PlanRestrictionException(
                    "Image uploads are not allowed on your current plan."
            );
        }

        boolean isDocument =
                lc.equals("application/pdf")
                        || lc.equals("application/msword")
                        || lc.equals(
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                )
                        || lc.equals("text/plain")
                        || lc.startsWith("application/vnd.ms-");

        if (isDocument && !subscription.getPlan().getAllowDocumentUpload()) {
            throw new PlanRestrictionException(
                    "Document uploads are not allowed on your current plan."
            );
        }
    }

    @Transactional
    public void reserveStorageForSharedUpload(Long ownerId, long bytes) {
        if (bytes <= 0) {
            return;
        }

        if (hasManagementQuotaBypass(ownerId)) {
            userRepository.atomicAddStorage(ownerId, bytes);

            log.info(
                    "[Quota] Reserved {}B for management ownerId={} "
                            + "without plan limit enforcement",
                    bytes,
                    ownerId
            );

            return;
        }

        long quotaLimitBytes = getPlanStorageLimitBytes(ownerId);

        int updated = userRepository.atomicAddStorageIfWithinQuota(
                ownerId,
                bytes,
                quotaLimitBytes
        );

        if (updated == 0) {
            log.warn(
                    "[Quota] Reservation denied for ownerId={}: "
                            + "{} bytes would exceed quota limit {}B",
                    ownerId,
                    bytes,
                    quotaLimitBytes
            );

            throw new StorageCapacityException(
                    "The link owner does not currently have enough "
                            + "storage capacity to accept this file."
            );
        }

        log.info(
                "[Quota] Reserved {}B for ownerId={} atomically",
                bytes,
                ownerId
        );
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

    private UserSubscription getActiveSubscription(Long userId) {
        return subscriptionService.getCurrentSubscription(userId);
    }

    private boolean hasManagementQuotaBypass(Long userId) {
        User user = findUser(userId);

        if (!rolePolicyService.isManagementAccount(user)) {
            return false;
        }

        log.info(
                "[Quota] Management-account bypass for userId={}, role={}",
                user.getId(),
                user.getRole()
        );

        return true;
    }
}
