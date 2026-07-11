package com.aistudyhub.backend.scheduler;

import com.aistudyhub.backend.entity.Document;
import com.aistudyhub.backend.repository.DocumentRepository;
import com.aistudyhub.backend.service.DocumentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Nightly scheduler that permanently deletes documents whose 30-day trash retention
 * window has expired (deleteAfter <= now()).
 *
 * <p>Runs daily at 02:00 server time. Enabled by {@code @EnableScheduling} in
 * {@link com.aistudyhub.backend.BackendApplication}.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TrashCleanupScheduler {

    private final DocumentRepository documentRepository;
    private final DocumentService documentService;

    /**
     * Finds all trashed documents whose {@code deleteAfter} has passed and
     * permanently deletes them (chunks → pgvector → file → record).
     *
     * Scheduled to run every day at 02:00 AM.
     * Cron: "0 0 2 * * *" = second=0, minute=0, hour=2, every day.
     */
    @Scheduled(cron = "0 0 2 * * *")
    public void cleanExpiredTrashedDocuments() {
        LocalDateTime now = LocalDateTime.now();
        log.info("[TrashCleanup] Running nightly cleanup at {}", now);

        List<Document> expired;
        try {
            expired = documentRepository.findExpiredTrashedDocuments(now);
        } catch (Exception e) {
            log.error("[TrashCleanup] Failed to query expired trashed documents: {}", e.getMessage(), e);
            return;
        }

        if (expired.isEmpty()) {
            log.info("[TrashCleanup] No expired trashed documents found.");
            return;
        }

        log.info("[TrashCleanup] Found {} expired document(s) to permanently delete.", expired.size());
        int successCount = 0;
        int failCount = 0;

        for (Document doc : expired) {
            try {
                log.info("[TrashCleanup] Permanently deleting document id={}, title='{}', trashedAt={}, deleteAfter={}",
                        doc.getId(), doc.getTitle(), doc.getTrashedAt(), doc.getDeleteAfter());
                documentService.permanentDeleteInternal(doc);
                successCount++;
            } catch (Exception e) {
                log.error("[TrashCleanup] Failed to permanently delete document id={}: {}",
                        doc.getId(), e.getMessage(), e);
                failCount++;
            }
        }

        log.info("[TrashCleanup] Cleanup complete. success={}, failed={}", successCount, failCount);
    }
}
