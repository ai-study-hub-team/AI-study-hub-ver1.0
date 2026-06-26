package com.aistudyhub.backend.service;

import com.aistudyhub.backend.entity.SubscriptionPlan;
import com.aistudyhub.backend.entity.UserSubscription;
import com.aistudyhub.backend.exception.PlanRestrictionException;
import com.aistudyhub.backend.exception.QuotaExceededException;
import com.aistudyhub.backend.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class StorageQuotaService {

    private final SubscriptionService subscriptionService;
    private final DocumentRepository documentRepository;

    @Transactional(readOnly = true)
    public void validateStorageLimit(Long userId, Long newFileBytes) {
        UserSubscription subscription = subscriptionService.getCurrentSubscription(userId);
        SubscriptionPlan plan = subscription.getPlan();

        Long currentStorageBytes = documentRepository.calculateTotalStorageUsedByUserId(userId);
        Long limitBytes = plan.getStorageLimitMb() * 1024 * 1024;

        if (currentStorageBytes + newFileBytes > limitBytes) {
            throw new QuotaExceededException(
                    String.format("Storage quota exceeded. Limit: %d MB. Current usage plus new file exceeds limit.", plan.getStorageLimitMb())
            );
        }
    }

    @Transactional(readOnly = true)
    public void validateFileSize(Long userId, Long newFileBytes) {
        UserSubscription subscription = subscriptionService.getCurrentSubscription(userId);
        SubscriptionPlan plan = subscription.getPlan();

        Long limitBytes = plan.getMaxUploadSizePerFileMb() * 1024 * 1024;

        if (newFileBytes > limitBytes) {
            throw new QuotaExceededException(
                    String.format("File size exceeds the maximum allowed size of %d MB for your plan.", plan.getMaxUploadSizePerFileMb())
            );
        }
    }

    @Transactional(readOnly = true)
    public void validateFileRestrictions(Long userId, String mimeType) {
        UserSubscription subscription = subscriptionService.getCurrentSubscription(userId);
        SubscriptionPlan plan = subscription.getPlan();

        if (mimeType == null) {
            return;
        }
        
        mimeType = mimeType.toLowerCase();

        if (mimeType.startsWith("video/") && !plan.getAllowVideoUpload()) {
            throw new PlanRestrictionException("Video uploads are not allowed on your current plan.");
        }
        if (mimeType.startsWith("audio/") && !plan.getAllowAudioUpload()) {
            throw new PlanRestrictionException("Audio uploads are not allowed on your current plan.");
        }
        if (mimeType.startsWith("image/") && !plan.getAllowImageUpload()) {
            throw new PlanRestrictionException("Image uploads are not allowed on your current plan.");
        }
        // Simplified check for documents
        boolean isDocument = mimeType.equals("application/pdf") || 
                             mimeType.equals("application/msword") || 
                             mimeType.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
                             mimeType.equals("text/plain") ||
                             mimeType.startsWith("application/vnd.ms-");
                             
        if (isDocument && !plan.getAllowDocumentUpload()) {
            throw new PlanRestrictionException("Document uploads are not allowed on your current plan.");
        }
    }
}
