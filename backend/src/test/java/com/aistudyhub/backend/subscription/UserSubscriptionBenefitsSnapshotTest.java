package com.aistudyhub.backend.subscription;

import com.aistudyhub.backend.entity.SubscriptionPlan;
import com.aistudyhub.backend.entity.UserSubscription;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UserSubscriptionBenefitsSnapshotTest {

    @Test
    void catalogChangesDoNotChangePreviouslySnapshottedBenefits() {
        SubscriptionPlan plan = planWithBenefits(2_048L, 1_000_000L);
        UserSubscription subscription = UserSubscription.builder()
                .plan(plan)
                .build();

        subscription.snapshotPlanBenefits();
        plan.setStorageLimitMb(5_120L);
        plan.setDailyTokenLimit(2_000_000L);
        plan.setAllowVideoUpload(true);

        assertThat(subscription.getEffectiveStorageLimitMb()).isEqualTo(2_048L);
        assertThat(subscription.getEffectiveDailyTokenLimit()).isEqualTo(1_000_000L);
        assertThat(subscription.getEffectiveAllowVideoUpload()).isFalse();
    }

    @Test
    void aNewPurchaseCanRefreshBenefitsFromTheCurrentCatalogPlan() {
        SubscriptionPlan plan = planWithBenefits(2_048L, 1_000_000L);
        UserSubscription subscription = UserSubscription.builder()
                .plan(plan)
                .build();
        subscription.snapshotPlanBenefits();

        plan.setStorageLimitMb(5_120L);
        plan.setDailyTokenLimit(2_000_000L);
        subscription.snapshotPlanBenefits();

        assertThat(subscription.getEffectiveStorageLimitMb()).isEqualTo(5_120L);
        assertThat(subscription.getEffectiveDailyTokenLimit()).isEqualTo(2_000_000L);
    }

    @Test
    void backfillDoesNotOverwriteAnExistingSnapshot() {
        SubscriptionPlan plan = planWithBenefits(2_048L, 1_000_000L);
        UserSubscription subscription = UserSubscription.builder()
                .plan(plan)
                .build();
        subscription.snapshotPlanBenefits();
        plan.setStorageLimitMb(5_120L);

        boolean changed = subscription.snapshotPlanBenefitsIfMissing();

        assertThat(changed).isFalse();
        assertThat(subscription.getEffectiveStorageLimitMb()).isEqualTo(2_048L);
    }

    private SubscriptionPlan planWithBenefits(long storageLimitMb, long dailyTokenLimit) {
        return SubscriptionPlan.builder()
                .storageLimitMb(storageLimitMb)
                .maxUploadSizePerFileMb(100L)
                .dailyTokenLimit(dailyTokenLimit)
                .allowImageUpload(true)
                .allowDocumentUpload(true)
                .allowVideoUpload(false)
                .allowAudioUpload(false)
                .build();
    }
}
