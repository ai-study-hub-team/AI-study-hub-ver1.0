package com.aistudyhub.backend.scheduler;

import com.aistudyhub.backend.entity.SharedDocumentSubmission;
import com.aistudyhub.backend.repository.SharedDocumentSubmissionRepository;
import com.aistudyhub.backend.service.SharedDocumentSubmissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Nightly scheduler with two responsibilities:
 *
 * <ol>
 *   <li>Expire PENDING_REVIEW submissions whose 30-day window has passed.
 *   <li>Retry Cloudinary deletion for submissions whose prior deletion failed.
 * </ol>
 *
 * <p>Each submission is processed independently — one failure does not stop the rest.
 * Failed submissions remain discoverable on the next run.
 *
 * <p>Runs at 02:30 AM daily — after the Document Trash cleanup scheduler.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SharedSubmissionCleanupScheduler {

    private final SharedDocumentSubmissionRepository submissionRepository;
    private final SharedDocumentSubmissionService submissionService;

    @Scheduled(cron = "0 30 2 * * *")
    public void runCleanup() {
        LocalDateTime now = LocalDateTime.now();
        log.info("[SharedSubmissionCleanup] Running at {}", now);

        // Phase 1: expired PENDING_REVIEW submissions
        List<SharedDocumentSubmission> expired;
        try {
            expired = submissionRepository.findExpiredPendingSubmissions(now);
        } catch (Exception e) {
            log.error("[SharedSubmissionCleanup] Failed to query expired submissions: {}", e.getMessage(), e);
            return;
        }

        int successCount = 0, failCount = 0;
        for (SharedDocumentSubmission s : expired) {
            try {
                log.info("[SharedSubmissionCleanup] Cleaning expired submission id={} deleteAfter={}",
                        s.getId(), s.getDeleteAfter());
                submissionService.cleanupExpiredSubmission(s);
                successCount++;
            } catch (Exception e) {
                log.error("[SharedSubmissionCleanup] Failed to clean expired submission id={}: {}",
                        s.getId(), e.getMessage(), e);
                failCount++;
            }
        }
        log.info("[SharedSubmissionCleanup] Phase-1 expired: success={} failed={}", successCount, failCount);

        // Phase 2: retry failed Cloudinary deletions. Quota remains charged until
        // the object is successfully deleted.
        List<SharedDocumentSubmission> failedDeletions;
        try {
            failedDeletions = submissionRepository.findSubmissionsWithFailedCloudDeletion();
        } catch (Exception e) {
            log.error("[SharedSubmissionCleanup] Failed to query cloud deletion retries: {}", e.getMessage(), e);
            return;
        }

        int retrySuccess = 0, retryFail = 0;
        for (SharedDocumentSubmission s : failedDeletions) {
            // Skip ones already processed in phase 1
            if (expired.stream().anyMatch(e -> e.getId().equals(s.getId()))) continue;
            try {
                log.info("[SharedSubmissionCleanup] Retrying cleanup for submission id={} status={} attempts={}",
                        s.getId(), s.getStatus(), s.getCloudDeleteAttempts());
                submissionService.retryFailedCloudDeletion(s);
                retrySuccess++;
            } catch (Exception e) {
                log.error("[SharedSubmissionCleanup] Retry failed for submission id={}: {}",
                        s.getId(), e.getMessage(), e);
                retryFail++;
            }
        }
        log.info("[SharedSubmissionCleanup] Phase-2 retry: success={} failed={}", retrySuccess, retryFail);
    }
}
