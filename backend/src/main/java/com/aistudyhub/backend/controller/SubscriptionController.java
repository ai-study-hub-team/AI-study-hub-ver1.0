package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.response.PlanResponse;
import com.aistudyhub.backend.dto.response.SubscriptionResponse;
import com.aistudyhub.backend.entity.SubscriptionPlan;
import com.aistudyhub.backend.entity.UserSubscription;
import com.aistudyhub.backend.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    @GetMapping("/current")
    public ResponseEntity<SubscriptionResponse> getCurrentSubscription(Authentication authentication) {
        Long userId = (Long) authentication.getDetails();
        UserSubscription subscription = subscriptionService.getCurrentSubscription(userId);

        SubscriptionPlan plan = subscription.getPlan();
        PlanResponse planResponse = PlanResponse.builder()
                .id(plan.getId())
                .code(plan.getCode())
                .name(plan.getName())
                .storageLimitMb(plan.getStorageLimitMb())
                .maxUploadSizePerFileMb(plan.getMaxUploadSizePerFileMb())
                .dailyTokenLimit(plan.getDailyTokenLimit())
                .price(plan.getPrice())
                .description(plan.getDescription())
                .allowImageUpload(plan.getAllowImageUpload())
                .allowDocumentUpload(plan.getAllowDocumentUpload())
                .allowVideoUpload(plan.getAllowVideoUpload())
                .allowAudioUpload(plan.getAllowAudioUpload())
                .isActive(plan.getIsActive())
                .build();

        SubscriptionResponse response = SubscriptionResponse.builder()
                .plan(planResponse)
                .startDate(subscription.getStartDate())
                .endDate(subscription.getEndDate())
                .status(subscription.getStatus().name())
                .build();

        return ResponseEntity.ok(response);
    }
}
