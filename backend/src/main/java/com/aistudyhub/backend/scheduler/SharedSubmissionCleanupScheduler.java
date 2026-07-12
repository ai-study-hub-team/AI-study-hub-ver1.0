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
 * Nightly scheduler that permanently removes PENDING_REVIEW shared document submissions
 * whose 30-day retention window has expired ({@code deleteAfter <= now()}).
 *
 * <p>Only PENDING_REVIEW submissions with a non-null deleteAfter are targeted.
 * Approved submissions have {@code deleteAfter = null} and are never touched by this job.
 * Rejected submissions are also left untouched (handled separately if needed).</p>
 *
 * <p>Runs at 02:30 AM daily — 30 minutes after the Document Trash cleanup
 * ({@link TrashCleanupScheduler}) to avoid resource contention.
 * {@code @EnableScheduling} is already present in {@code BackendApplication}.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SharedSubmissionCleanupScheduler {

    private final SharedDocumentSubmissionRepository submissionRepository;
    private final SharedDocumentSubmissionService submissionService;

    /**
     * Finds all expired PENDING_REVIEW submissions and permanently deletes them.
     *
     * <p>Cron: {@code "0 30 2 * * *"} = second=0, minute=30, hour=2, every day.</p>
     *
     * <p>One submission failure does not stop the rest — each is processed independently.</p>
     */
    @Scheduled(cron = "0 30 2 * * *")
    public void cleanExpiredPendingSubmissions() {
        LocalDateTime now = LocalDateTime.now();
        log.info("[SharedSubmissionCleanup] Running nightly cleanup at {}", now);

        List<SharedDocumentSubmission> expired;
        try {
            expired = submissionRepository.findExpiredPendingSubmissions(now);
        } catch (Exception e) {
            log.error("[SharedSubmissionCleanup] Failed to query expired pending submissions: {}",
                    e.getMessage(), e);
            return;
        }

        if (expired.isEmpty()) {
            log.info("[SharedSubmissionCleanup] No expired pending submissions found.");
            return;
        }

        log.info("[SharedSubmissionCleanup] Found {} expired pending submission(s) to purge.",
                expired.size());

        int successCount = 0;
        int failCount = 0;

        for (SharedDocumentSubmission submission : expired) {
            try {
                log.info("[SharedSubmissionCleanup] Processing submission id={}, title='{}', " +
                                "ownerUserId={}, deleteAfter={}",
                        submission.getId(), submission.getTitle(),
                        submission.getOwnerUserId(), submission.getDeleteAfter());

                submissionService.cleanupExpiredSubmission(submission);
                successCount++;

            } catch (Exception e) {
                // Log failure and continue — one bad submission must not block the rest.
                // The failed submission remains in DB and will be retried on the next run.
                log.error("[SharedSubmissionCleanup] Failed to purge submission id={}: {}",
                        submission.getId(), e.getMessage(), e);
                failCount++;
            }
        }

        log.info("[SharedSubmissionCleanup] Cleanup complete. success={}, failed={}",
                successCount, failCount);
    }
}
