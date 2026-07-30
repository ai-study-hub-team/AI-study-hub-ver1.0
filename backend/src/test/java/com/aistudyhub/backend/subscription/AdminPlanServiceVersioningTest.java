package com.aistudyhub.backend.subscription;

import com.aistudyhub.backend.dto.request.AdminPlanRequest;
import com.aistudyhub.backend.entity.SubscriptionPlan;
import com.aistudyhub.backend.repository.SubscriptionPlanRepository;
import com.aistudyhub.backend.service.AdminPlanService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminPlanServiceVersioningTest {

    @Mock
    SubscriptionPlanRepository planRepository;

    @Test
    void updatePaidPlanSupersedesOldVersionAndPublishesNewVersion() {
        SubscriptionPlan oldVersion = SubscriptionPlan.builder()
                .id(2L)
                .code("PRO")
                .version(1)
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

        when(planRepository.findById(2L)).thenReturn(Optional.of(oldVersion));
        when(planRepository.saveAndFlush(oldVersion)).thenReturn(oldVersion);
        when(planRepository.save(org.mockito.ArgumentMatchers.any(SubscriptionPlan.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AdminPlanService service = new AdminPlanService(planRepository);
        service.updatePlan(2L, updateRequest());

        assertThat(oldVersion.getIsActive()).isFalse();
        assertThat(oldVersion.getStorageLimitMb()).isEqualTo(2_048L);
        assertThat(oldVersion.getDailyTokenLimit()).isEqualTo(1_000_000L);
        assertThat(oldVersion.getSupersededAt()).isNotNull();

        verify(planRepository).saveAndFlush(oldVersion);

        ArgumentCaptor<SubscriptionPlan> savedPlan =
                ArgumentCaptor.forClass(SubscriptionPlan.class);
        verify(planRepository).save(savedPlan.capture());

        SubscriptionPlan newVersion = savedPlan.getValue();
        assertThat(newVersion.getCode()).isEqualTo("PRO");
        assertThat(newVersion.getVersion()).isEqualTo(2);
        assertThat(newVersion.getPreviousVersion()).isSameAs(oldVersion);
        assertThat(newVersion.getStorageLimitMb()).isEqualTo(5_120L);
        assertThat(newVersion.getDailyTokenLimit()).isEqualTo(2_000_000L);
        assertThat(newVersion.getIsActive()).isTrue();
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
