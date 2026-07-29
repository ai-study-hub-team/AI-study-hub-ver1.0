package com.aistudyhub.backend.subscription;

import com.aistudyhub.backend.dto.request.AdminPlanRequest;
import com.aistudyhub.backend.entity.SubscriptionPlan;
import com.aistudyhub.backend.entity.UserSubscription;
import com.aistudyhub.backend.repository.SubscriptionPlanRepository;
import com.aistudyhub.backend.repository.UserSubscriptionRepository;
import com.aistudyhub.backend.service.AdminPlanService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminPlanServiceSnapshotTest {

    @Mock
    SubscriptionPlanRepository planRepository;

    @Mock
    UserSubscriptionRepository subscriptionRepository;

    @Test
    void updatePlanBackfillsOldSubscriptionsBeforeChangingCatalogBenefits() {
        SubscriptionPlan plan = SubscriptionPlan.builder()
                .id(2L)
                .code("PRO")
                .name("Pro")
                .storageLimitMb(2_048L)
                .maxUploadSizePerFileMb(100L)
                .dailyTokenLimit(1_000_000L)
                .price(BigDecimal.valueOf(99_000))
                .durationDays(30)
                .allowImageUpload(true)
                .allowDocumentUpload(true)
                .allowVideoUpload(false)
                .allowAudioUpload(false)
                .isActive(true)
                .build();
        UserSubscription oldSubscription = UserSubscription.builder()
                .plan(plan)
                .build();
        AdminPlanRequest request = updateRequest();

        when(planRepository.findById(2L)).thenReturn(Optional.of(plan));
        when(subscriptionRepository.findAllByPlanId(2L)).thenReturn(List.of(oldSubscription));
        when(planRepository.save(plan)).thenReturn(plan);

        AdminPlanService service = new AdminPlanService(planRepository, subscriptionRepository);
        service.updatePlan(2L, request);

        assertThat(oldSubscription.getEffectiveStorageLimitMb()).isEqualTo(2_048L);
        assertThat(oldSubscription.getEffectiveDailyTokenLimit()).isEqualTo(1_000_000L);
        assertThat(plan.getStorageLimitMb()).isEqualTo(5_120L);
        assertThat(plan.getDailyTokenLimit()).isEqualTo(2_000_000L);

        InOrder writes = inOrder(subscriptionRepository, planRepository);
        writes.verify(subscriptionRepository).saveAll(List.of(oldSubscription));
        writes.verify(planRepository).save(plan);
    }

    private AdminPlanRequest updateRequest() {
        AdminPlanRequest request = new AdminPlanRequest();
        request.setCode("PRO");
        request.setName("Pro Plus");
        request.setStorageLimitMb(5_120L);
        request.setMaxUploadSizePerFileMb(200L);
        request.setDailyTokenLimit(2_000_000L);
        request.setPrice(BigDecimal.valueOf(149_000));
        request.setDurationDays(30);
        request.setDescription("Updated plan");
        request.setAllowImageUpload(true);
        request.setAllowDocumentUpload(true);
        request.setAllowVideoUpload(true);
        request.setAllowAudioUpload(true);
        request.setIsActive(true);
        return request;
    }
}
