package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.AdminPlanRequest;
import com.aistudyhub.backend.dto.response.PlanResponse;
import com.aistudyhub.backend.service.AdminPlanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/plans")
@RequiredArgsConstructor
public class AdminPlanController {

    private final AdminPlanService adminPlanService;

    @GetMapping
    public ResponseEntity<List<PlanResponse>> getAllPlans() {
        return ResponseEntity.ok(adminPlanService.getAllPlans());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PlanResponse> getPlanById(@PathVariable Long id) {
        return ResponseEntity.ok(adminPlanService.getPlanById(id));
    }

    @PostMapping
    public ResponseEntity<PlanResponse> createPlan(@Valid @RequestBody AdminPlanRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminPlanService.createPlan(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PlanResponse> updatePlan(@PathVariable Long id, @Valid @RequestBody AdminPlanRequest request) {
        return ResponseEntity.ok(adminPlanService.updatePlan(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlan(@PathVariable Long id) {
        adminPlanService.deletePlan(id);
        return ResponseEntity.noContent().build();
    }
}
