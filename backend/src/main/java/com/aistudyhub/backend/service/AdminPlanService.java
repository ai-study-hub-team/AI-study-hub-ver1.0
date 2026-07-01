package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.request.AdminPlanRequest;
import com.aistudyhub.backend.dto.response.PlanResponse;
import com.aistudyhub.backend.entity.SubscriptionPlan;
import com.aistudyhub.backend.repository.SubscriptionPlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
        if (subscriptionPlanRepository.findByCode(request.getCode()).isPresent()) {
            throw new RuntimeException("Plan with code " + request.getCode() + " already exists");
        }

        SubscriptionPlan plan = SubscriptionPlan.builder()
                .code(request.getCode())
                .name(request.getName())
                .storageLimitMb(request.getStorageLimitMb())
                .maxUploadSizePerFileMb(request.getMaxUploadSizePerFileMb())
                .dailyTokenLimit(request.getDailyTokenLimit())
                .price(request.getPrice())
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
        SubscriptionPlan plan = subscriptionPlanRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plan not found with id: " + id));

        if (!plan.getCode().equals(request.getCode()) && subscriptionPlanRepository.findByCode(request.getCode()).isPresent()) {
            throw new RuntimeException("Plan with code " + request.getCode() + " already exists");
        }

        // FREE plan code cannot be changed
        if (plan.getCode().equals("FREE") && !request.getCode().equals("FREE")) {
            throw new RuntimeException("Cannot change the code of the FREE plan");
        }
        
        // FREE plan must remain active
        if (plan.getCode().equals("FREE") && !request.getIsActive()) {
            throw new RuntimeException("Cannot disable the FREE plan");
        }

        plan.setCode(request.getCode());
        plan.setName(request.getName());
        plan.setStorageLimitMb(request.getStorageLimitMb());
        plan.setMaxUploadSizePerFileMb(request.getMaxUploadSizePerFileMb());
        plan.setDailyTokenLimit(request.getDailyTokenLimit());
        plan.setPrice(request.getPrice());
        plan.setDescription(request.getDescription());
        plan.setAllowImageUpload(request.getAllowImageUpload());
        plan.setAllowDocumentUpload(request.getAllowDocumentUpload());
        plan.setAllowVideoUpload(request.getAllowVideoUpload());
        plan.setAllowAudioUpload(request.getAllowAudioUpload());
        plan.setIsActive(request.getIsActive());

        return toResponse(subscriptionPlanRepository.save(plan));
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
    private PlanResponse toResponse(SubscriptionPlan plan) {
        return PlanResponse.builder()
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
    }
}
