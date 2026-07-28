package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.response.PlanResponse;
import com.aistudyhub.backend.dto.response.SubscriptionResponse;
import com.aistudyhub.backend.entity.SubscriptionPlan;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.entity.UserSubscription;
import com.aistudyhub.backend.service.CurrentUserService;
import com.aistudyhub.backend.service.RolePolicyService;
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
    private final CurrentUserService currentUserService;
    private final RolePolicyService rolePolicyService;

    @GetMapping("/current")
    public ResponseEntity<SubscriptionResponse> getCurrentSubscription(Authentication authentication) {
        User currentUser = currentUserService.getCurrentUser();

        if (rolePolicyService.isManagementAccount(currentUser)) {
            return ResponseEntity.ok(SubscriptionResponse.builder()
                    .plan(null)
                    .startDate(null)
                    .endDate(null)
                    .status("NOT_APPLICABLE")
                    .build());
        }

        Long userId = (Long) authentication.getDetails();
        UserSubscription subscription = subscriptionService.getCurrentSubscription(userId);

        SubscriptionPlan plan = subscription.getPlan();
        PlanResponse planResponse = PlanResponse.builder()
                .id(plan.getId())
                .code(plan.getCode())
                .name(plan.getName())
                .storageLimitMb(subscription.getEffectiveStorageLimitMb())
                .maxUploadSizePerFileMb(subscription.getEffectiveMaxUploadSizePerFileMb())
                .dailyTokenLimit(subscription.getEffectiveDailyTokenLimit())
                .price(plan.getPrice())
                .description(plan.getDescription())
                .allowImageUpload(subscription.getEffectiveAllowImageUpload())
                .allowDocumentUpload(subscription.getEffectiveAllowDocumentUpload())
                .allowVideoUpload(subscription.getEffectiveAllowVideoUpload())
                .allowAudioUpload(subscription.getEffectiveAllowAudioUpload())
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
