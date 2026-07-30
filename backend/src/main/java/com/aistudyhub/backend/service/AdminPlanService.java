package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.request.AdminPlanRequest;
import com.aistudyhub.backend.dto.response.PlanResponse;
import com.aistudyhub.backend.entity.SubscriptionPlan;
import com.aistudyhub.backend.repository.SubscriptionPlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminPlanService {

    private final SubscriptionPlanRepository subscriptionPlanRepository;

    @Transactional(readOnly = true)
    public List<PlanResponse> getAllPlans() {
        return subscriptionPlanRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PlanResponse getPlanById(Long id) {
        return subscriptionPlanRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new RuntimeException("Plan not found with id: " + id));
    }

    @Transactional
    public PlanResponse createPlan(AdminPlanRequest request) {
        validateDuration(request);

        String code = normalizeCode(request.getCode());
        if (subscriptionPlanRepository.existsByCodeAndIsActiveTrue(code)) {
            throw new RuntimeException("An active plan with code " + code + " already exists");
        }

        SubscriptionPlan plan = SubscriptionPlan.builder()
                .code(code)
                .version(nextVersion(code))
                .name(request.getName())
                .storageLimitMb(request.getStorageLimitMb())
                .maxUploadSizePerFileMb(request.getMaxUploadSizePerFileMb())
                .dailyTokenLimit(request.getDailyTokenLimit())
                .maxShareLinksPerDay(request.getMaxShareLinksPerDay())
                .price(request.getPrice())
                .durationDays(request.getDurationDays())
                .description(request.getDescription())
                .allowImageUpload(request.getAllowImageUpload())
                .allowDocumentUpload(request.getAllowDocumentUpload())
                .allowVideoUpload(request.getAllowVideoUpload())
                .allowAudioUpload(request.getAllowAudioUpload())
                .isActive(request.getIsActive())
                .build();

        return toResponse(subscriptionPlanRepository.save(plan));
    }

    @Transactional
    public PlanResponse updatePlan(Long id, AdminPlanRequest request) {
        validateDuration(request);

        SubscriptionPlan plan = subscriptionPlanRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plan not found with id: " + id));

        String requestedCode = normalizeCode(request.getCode());
        if (!plan.getCode().equals(requestedCode)) {
            throw new RuntimeException("Cannot change a plan code when publishing a new version");
        }

        // FREE plan code cannot be changed
        // FREE plan must remain active
        if (plan.getCode().equals("FREE") && !request.getIsActive()) {
            throw new RuntimeException("Cannot disable the FREE plan");
        }

        // FREE is the baseline entitlement rather than a purchased product.
        // Keep its stable row so expired subscriptions can always return to it.
        if (plan.getCode().equals("FREE")) {
            applyRequest(plan, request);
            return toResponse(subscriptionPlanRepository.save(plan));
        }

        if (!Boolean.TRUE.equals(plan.getIsActive())) {
            throw new RuntimeException("Only the currently active plan version can be revised");
        }

        LocalDateTime now = LocalDateTime.now();
        plan.setIsActive(false);
        plan.setSupersededAt(now);
        // Flush the retirement before inserting the replacement so the
        // database invariant of one active version per code is never violated.
        subscriptionPlanRepository.saveAndFlush(plan);

        SubscriptionPlan newVersion = SubscriptionPlan.builder()
                .code(plan.getCode())
                .version(plan.getVersion() + 1)
                .name(request.getName())
                .storageLimitMb(request.getStorageLimitMb())
                .maxUploadSizePerFileMb(request.getMaxUploadSizePerFileMb())
                .dailyTokenLimit(request.getDailyTokenLimit())
                .maxShareLinksPerDay(request.getMaxShareLinksPerDay())
                .price(request.getPrice())
                .durationDays(request.getDurationDays())
                .description(request.getDescription())
                .allowImageUpload(request.getAllowImageUpload())
                .allowDocumentUpload(request.getAllowDocumentUpload())
                .allowVideoUpload(request.getAllowVideoUpload())
                .allowAudioUpload(request.getAllowAudioUpload())
                .isActive(request.getIsActive())
                .effectiveFrom(now)
                .previousVersion(plan)
                .build();

        SubscriptionPlan saved = subscriptionPlanRepository.save(newVersion);
        log.info("Published plan {} version {} from version {}", saved.getCode(),
                saved.getVersion(), plan.getVersion());
        return toResponse(saved);
    }

    @Transactional
    public void deletePlan(Long id) {
        SubscriptionPlan plan = subscriptionPlanRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plan not found with id: " + id));

        if (plan.getCode().equals("FREE")) {
            throw new RuntimeException("Cannot delete the FREE plan");
        }

        // Instead of hard delete, we soft delete (disable) it.
        // If there are existing users, they will keep using it, but it won't be available for new purchases.
        plan.setIsActive(false);
        subscriptionPlanRepository.save(plan);
        log.info("Soft deleted (disabled) plan with id: {}", id);
    }
 // trả về frontend
    private void validateDuration(AdminPlanRequest request) {
        boolean paidPlan = request.getPrice() != null
                && request.getPrice().compareTo(BigDecimal.ZERO) > 0;

        if (paidPlan && (request.getDurationDays() == null || request.getDurationDays() <= 0)) {
            throw new RuntimeException("Paid plans must have durationDays greater than 0");
        }
    }

    private int nextVersion(String code) {
        return subscriptionPlanRepository.findFirstByCodeOrderByVersionDesc(code)
                .map(plan -> plan.getVersion() + 1)
                .orElse(1);
    }

    private String normalizeCode(String code) {
        return code.trim().toUpperCase();
    }

    private void applyRequest(SubscriptionPlan plan, AdminPlanRequest request) {
        plan.setName(request.getName());
        plan.setStorageLimitMb(request.getStorageLimitMb());
        plan.setMaxUploadSizePerFileMb(request.getMaxUploadSizePerFileMb());
        plan.setDailyTokenLimit(request.getDailyTokenLimit());
        plan.setMaxShareLinksPerDay(request.getMaxShareLinksPerDay());
        plan.setPrice(request.getPrice());
        plan.setDurationDays(request.getDurationDays());
        plan.setDescription(request.getDescription());
        plan.setAllowImageUpload(request.getAllowImageUpload());
        plan.setAllowDocumentUpload(request.getAllowDocumentUpload());
        plan.setAllowVideoUpload(request.getAllowVideoUpload());
        plan.setAllowAudioUpload(request.getAllowAudioUpload());
        plan.setIsActive(request.getIsActive());
    }

    private PlanResponse toResponse(SubscriptionPlan plan) {
        return PlanResponse.builder()
                .id(plan.getId())
                .code(plan.getCode())
                .version(plan.getVersion())
                .name(plan.getName())
                .storageLimitMb(plan.getStorageLimitMb())
                .maxUploadSizePerFileMb(plan.getMaxUploadSizePerFileMb())
                .dailyTokenLimit(plan.getDailyTokenLimit())
                .maxShareLinksPerDay(plan.getMaxShareLinksPerDay())
                .price(plan.getPrice())
                .durationDays(plan.getDurationDays())
                .description(plan.getDescription())
                .allowImageUpload(plan.getAllowImageUpload())
                .allowDocumentUpload(plan.getAllowDocumentUpload())
                .allowVideoUpload(plan.getAllowVideoUpload())
                .allowAudioUpload(plan.getAllowAudioUpload())
                .isActive(plan.getIsActive())
                .build();
    }
}
