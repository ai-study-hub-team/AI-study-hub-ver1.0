package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.response.PlanResponse;
import com.aistudyhub.backend.dto.response.SubscriptionResponse;
import com.aistudyhub.backend.entity.SubscriptionPlan;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.entity.UserSubscription;
import com.aistudyhub.backend.enums.SubscriptionStatus;
import com.aistudyhub.backend.repository.SubscriptionPlanRepository;
import com.aistudyhub.backend.repository.UserRepository;
import com.aistudyhub.backend.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    private final UserSubscriptionRepository userSubscriptionRepository;
    private final SubscriptionPlanRepository subscriptionPlanRepository;
    private final UserRepository userRepository;

    @Transactional
    // user đăng ký tài khoản auto freeplan
    public void assignFreePlan(User user) {
        SubscriptionPlan freePlan = subscriptionPlanRepository.findByCode("FREE")
                .orElseThrow(() -> new RuntimeException("Critical: FREE plan not found in database"));

        UserSubscription subscription = userSubscriptionRepository.findByUserId(user.getId())
                .orElse(UserSubscription.builder()
                        .user(user)
                        .build());

        subscription.setPlan(freePlan);
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setStartDate(LocalDateTime.now());
        subscription.setEndDate(null);

        userSubscriptionRepository.save(subscription);
        log.info("Assigned FREE plan to user ID: {}", user.getId());
    }

    @Transactional(readOnly = true)

    public UserSubscription getCurrentSubscription(Long userId) {
        return userSubscriptionRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("User subscription not found for user ID: " + userId));
    }

    @Transactional
    public SubscriptionResponse updateUserPlanByAdmin(Long userId, String planCode) {
        String normalizedPlanCode = planCode.trim().toUpperCase(Locale.ROOT);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        SubscriptionPlan plan = subscriptionPlanRepository.findByCode(normalizedPlanCode)
                .orElseThrow(() -> new RuntimeException("Plan not found: " + normalizedPlanCode));

        if (!Boolean.TRUE.equals(plan.getIsActive())) {
            throw new RuntimeException("Cannot assign inactive plan: " + normalizedPlanCode);
        }

        UserSubscription subscription = userSubscriptionRepository.findByUserId(userId)
                .orElse(UserSubscription.builder()
                        .user(user)
                        .build());

        subscription.setPlan(plan);
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setStartDate(LocalDateTime.now());
        subscription.setEndDate(null);

        UserSubscription saved = userSubscriptionRepository.save(subscription);
        log.info("Admin changed user ID {} to plan {}", userId, normalizedPlanCode);

        return toResponse(saved);
    }

    @Transactional
    //mua proplan
    public void processSuccessfulPayment(Long userId, String planCode, Integer purchasedDays) {
        SubscriptionPlan newPlan = subscriptionPlanRepository.findByCode(planCode)
                .orElseThrow(() -> new RuntimeException("Plan not found: " + planCode));

        UserSubscription subscription = getCurrentSubscription(userId);

        if (subscription.getPlan().getCode().equals(planCode) && subscription.getStatus() == SubscriptionStatus.ACTIVE && subscription.getEndDate() != null) {
            // Extend existing PRO plan
            subscription.setEndDate(subscription.getEndDate().plusDays(purchasedDays));
            log.info("Extended {} plan for user ID: {}. New end date: {}", planCode, userId, subscription.getEndDate());
        } else {
            // Upgrade or change plan
            subscription.setPlan(newPlan);
            subscription.setStatus(SubscriptionStatus.ACTIVE);
            subscription.setStartDate(LocalDateTime.now());
            subscription.setEndDate(LocalDateTime.now().plusDays(purchasedDays));
            log.info("Upgraded to {} plan for user ID: {}. End date: {}", planCode, userId, subscription.getEndDate());
        }

        userSubscriptionRepository.save(subscription);
    }

    @Transactional
    // check trạng thái hằng ngày xem hết gói chưa
    public void expireOverdueSubscriptions() {
        LocalDateTime now = LocalDateTime.now();
        var overdueSubscriptions = userSubscriptionRepository.findAllByStatusAndEndDateBefore(SubscriptionStatus.ACTIVE, now);

        if (overdueSubscriptions.isEmpty()) {
            return;
        }

        SubscriptionPlan freePlan = subscriptionPlanRepository.findByCode("FREE")
                .orElseThrow(() -> new RuntimeException("Critical: FREE plan not found in database"));

        for (UserSubscription sub : overdueSubscriptions) {
            log.info("Subscription expired for user ID: {}. Reverting to FREE plan.", sub.getUser().getId());
            sub.setPlan(freePlan);
            sub.setEndDate(null);
            sub.setStatus(SubscriptionStatus.ACTIVE);
            userSubscriptionRepository.save(sub);
        }
    }

    private SubscriptionResponse toResponse(UserSubscription subscription) {
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

        return SubscriptionResponse.builder()
                .plan(planResponse)
                .startDate(subscription.getStartDate())
                .endDate(subscription.getEndDate())
                .status(subscription.getStatus().name())
                .build();
    }
}
