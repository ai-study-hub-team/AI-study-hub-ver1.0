package com.aistudyhub.backend.service;

import com.aistudyhub.backend.entity.NotificationType;
import com.aistudyhub.backend.entity.SubscriptionPlan;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.entity.UserSubscription;
import com.aistudyhub.backend.enums.SubscriptionStatus;
import com.aistudyhub.backend.repository.SubscriptionPlanRepository;
import com.aistudyhub.backend.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    private final UserSubscriptionRepository userSubscriptionRepository;
    private final SubscriptionPlanRepository subscriptionPlanRepository;
    private final ResendEmailService resendEmailService;
    private final NotificationService notificationService;


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

        subscription.setExpiryReminder7DaysSentAt(null);
        subscription.setExpiredNotificationSentAt(null);
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

    @Transactional
    public void sendExpiryNotifications() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime start7 = now.plusDays(7).toLocalDate().atStartOfDay();
        LocalDateTime end7 = start7.plusDays(1);

        var expiringSoon = userSubscriptionRepository.findAllByStatusAndEndDateBetween(
                SubscriptionStatus.ACTIVE,
                start7,
                end7
        );

        for (UserSubscription sub : expiringSoon) {
            if (sub.getExpiryReminder7DaysSentAt() != null) {
                continue;
            }

            resendEmailService.sendSubscriptionExpiryEmail(
                    sub.getUser(),
                    sub.getPlan().getName(),
                    sub.getEndDate(),
                    false
            );


            notificationService.create(
                    sub.getUser(),
                    NotificationType.SUBSCRIPTION_EXPIRING_7_DAYS,
                    "Subscription expires soon",
                    "Your " + sub.getPlan().getName() + " plan expires on " + sub.getEndDate(),
                    "SUBSCRIPTION",
                    sub.getId(),
                    "/app/subscription"
            );

            sub.setExpiryReminder7DaysSentAt(now);
            userSubscriptionRepository.save(sub);
        }
    }

    @Transactional
    public void sendExpiredNotificationsAndExpirePlans() {
        LocalDateTime now = LocalDateTime.now();
        var overdueSubscriptions =
                userSubscriptionRepository.findAllByStatusAndEndDateBefore(
                        SubscriptionStatus.ACTIVE,
                        now
                );

        if (overdueSubscriptions.isEmpty()) {
            return;
        }

        SubscriptionPlan freePlan = subscriptionPlanRepository.findByCode("FREE")
                .orElseThrow(() -> new RuntimeException("Critical: FREE plan not found in database"));

        for (UserSubscription sub : overdueSubscriptions) {
            if (sub.getExpiredNotificationSentAt() == null) {
                resendEmailService.sendSubscriptionExpiryEmail(
                        sub.getUser(),
                        sub.getPlan().getName(),
                        sub.getEndDate(),
                        true
                );

                notificationService.create(
                        sub.getUser(),
                        NotificationType.SUBSCRIPTION_EXPIRED,
                        "Subscription expired",
                        "Your " + sub.getPlan().getName() + " plan has expired",
                        "SUBSCRIPTION",
                        sub.getId(),
                        "/app/subscription"
                );

                sub.setExpiredNotificationSentAt(now);
            }

            log.info("Subscription expired for user ID: {}. Reverting to FREE plan.",
                    sub.getUser().getId());
            sub.setPlan(freePlan);
            sub.setEndDate(null);
            sub.setStatus(SubscriptionStatus.ACTIVE);
            userSubscriptionRepository.save(sub);
        }
    }
}
