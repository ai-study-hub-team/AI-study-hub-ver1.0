package com.aistudyhub.backend.seeder;

import com.aistudyhub.backend.entity.SubscriptionPlan;
import com.aistudyhub.backend.repository.SubscriptionPlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Component
@RequiredArgsConstructor
@Slf4j
public class SubscriptionDataSeeder implements CommandLineRunner {

    private final SubscriptionPlanRepository subscriptionPlanRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info("Checking and seeding foundational Subscription Plans...");

        if (subscriptionPlanRepository.findByCode("FREE").isEmpty()) {
            SubscriptionPlan freePlan = SubscriptionPlan.builder()
                    .code("FREE")
                    .name("FREE")
                    .storageLimitMb(500L)
                    .maxUploadSizePerFileMb(10L)
                    .dailyTokenLimit(50000L)
                    .price(BigDecimal.ZERO)
                    .description("Free plan for individuals")
                    .allowImageUpload(true)
                    .allowDocumentUpload(true)
                    .allowAudioUpload(false)
                    .allowVideoUpload(false)
                    .isActive(true)
                    .build();
            subscriptionPlanRepository.save(freePlan);
            log.info("Seeded FREE plan.");
        }

        if (subscriptionPlanRepository.findByCode("PRO").isEmpty()) {
            SubscriptionPlan proPlan = SubscriptionPlan.builder()
                    .code("PRO")
                    .name("PRO")
                    .storageLimitMb(2048L)
                    .maxUploadSizePerFileMb(500L)
                    .dailyTokenLimit(3000000L)
                    .price(new BigDecimal("99000"))
                    .description("Pro plan for power users")
                    .allowImageUpload(true)
                    .allowDocumentUpload(true)
                    .allowAudioUpload(true)
                    .allowVideoUpload(true)
                    .isActive(true)
                    .build();
            subscriptionPlanRepository.save(proPlan);
            log.info("Seeded PRO plan.");
        }
    }
}
