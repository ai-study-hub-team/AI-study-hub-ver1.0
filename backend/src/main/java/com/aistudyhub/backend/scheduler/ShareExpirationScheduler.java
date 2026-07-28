package com.aistudyhub.backend.scheduler;

import com.aistudyhub.backend.entity.DocumentShare;
import com.aistudyhub.backend.entity.DocumentShareLink;
import com.aistudyhub.backend.entity.DocumentShareStatus;
import com.aistudyhub.backend.entity.FolderShare;
import com.aistudyhub.backend.entity.FolderShareStatus;
import com.aistudyhub.backend.entity.NotificationType;
import com.aistudyhub.backend.repository.DocumentShareLinkRepository;
import com.aistudyhub.backend.repository.DocumentShareRepository;
import com.aistudyhub.backend.repository.FolderShareRepository;
import com.aistudyhub.backend.service.DocumentShareLinkService;
import com.aistudyhub.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ShareExpirationScheduler {

    private final DocumentShareRepository documentShareRepository;
    private final FolderShareRepository folderShareRepository;
    private final DocumentShareLinkRepository shareLinkRepository;
    private final DocumentShareLinkService shareLinkService;
    private final NotificationService notificationService;

    @Scheduled(cron = "0 45 2 * * *")
    @Transactional
    public void expireSharesAndLinks() {
        LocalDateTime now = LocalDateTime.now();

        int expiredDocumentShares = expireDocumentShares(now);
        int expiredFolderShares = expireFolderShares(now);
        int expiredUploadLinks = expireUploadLinks(now);

        log.info(
                "[ShareExpiration] Expired documentShares={} folderShares={} uploadLinks={}",
                expiredDocumentShares,
                expiredFolderShares,
                expiredUploadLinks
        );
    }

    private int expireDocumentShares(LocalDateTime now) {
        List<DocumentShare> shares = documentShareRepository.findByStatusAndExpiresAtBefore(
                DocumentShareStatus.ACTIVE,
                now
        );

        for (DocumentShare share : shares) {
            share.setStatus(DocumentShareStatus.EXPIRED);
            documentShareRepository.save(share);

            String title = share.getDocument().getTitle();
            notificationService.create(
                    share.getOwner(),
                    NotificationType.DOCUMENT_SHARE_EXPIRED_OWNER,
                    "Document share expired",
                    "Share access for document \"" + title + "\" with "
                            + share.getSharedWith().getEmail() + " has expired",
                    "DOCUMENT",
                    share.getDocument().getId(),
                    "/app/library/" + share.getDocument().getId() + "/preview"
            );
            notificationService.create(
                    share.getSharedWith(),
                    NotificationType.DOCUMENT_SHARE_EXPIRED_RECEIVER,
                    "Document access expired",
                    "Your access to document \"" + title + "\" has expired",
                    "DOCUMENT",
                    share.getDocument().getId(),
                    "/app/shared-with-me"
            );
        }

        return shares.size();
    }

    private int expireFolderShares(LocalDateTime now) {
        List<FolderShare> shares = folderShareRepository.findByStatusAndExpiresAtBefore(
                FolderShareStatus.ACTIVE,
                now
        );

        for (FolderShare share : shares) {
            share.setStatus(FolderShareStatus.EXPIRED);
            folderShareRepository.save(share);

            String name = share.getFolder().getName();
            notificationService.create(
                    share.getOwner(),
                    NotificationType.FOLDER_SHARE_EXPIRED_OWNER,
                    "Folder share expired",
                    "Share access for folder \"" + name + "\" with "
                            + share.getSharedWith().getEmail() + " has expired",
                    "FOLDER",
                    share.getFolder().getId(),
                    "/app/folders/" + share.getFolder().getId()
            );
            notificationService.create(
                    share.getSharedWith(),
                    NotificationType.FOLDER_SHARE_EXPIRED_RECEIVER,
                    "Folder access expired",
                    "Your access to folder \"" + name + "\" has expired",
                    "FOLDER",
                    share.getFolder().getId(),
                    "/app/shared-with-me"
            );
        }

        return shares.size();
    }

    private int expireUploadLinks(LocalDateTime now) {
        List<DocumentShareLink> links = shareLinkRepository.findByStatusAndExpiresAtBefore(
                DocumentShareStatus.ACTIVE,
                now
        );

        for (DocumentShareLink link : links) {
            shareLinkService.expireLinkAndNotify(link);
        }

        return links.size();
    }
}
