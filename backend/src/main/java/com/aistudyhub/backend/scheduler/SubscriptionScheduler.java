package com.aistudyhub.backend.scheduler;

import com.aistudyhub.backend.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SubscriptionScheduler {

    private final SubscriptionService subscriptionService;

    // Run every hour
    @Scheduled(cron = "0 0 0 * * *")
    public void checkOverdueSubscriptions() {
        log.info("Running scheduled task to check for overdue subscriptions...");
        subscriptionService.expireOverdueSubscriptions();
        log.info("Finished checking overdue subscriptions.");
    }
}
