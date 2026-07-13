package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.AdminUpdateUserRequest;
import com.aistudyhub.backend.dto.request.UserPlanUpdateRequest;
import com.aistudyhub.backend.dto.request.UserStatusUpdateRequest;
import com.aistudyhub.backend.dto.request.UserUpdateRequest;
import com.aistudyhub.backend.dto.response.SubscriptionResponse;
import com.aistudyhub.backend.dto.response.UserResponse;
import com.aistudyhub.backend.service.SubscriptionService;
import com.aistudyhub.backend.service.UserService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@SecurityRequirement(name = "bearerAuth")

@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final SubscriptionService subscriptionService;

    @GetMapping
    public ResponseEntity<List<UserResponse>> getAll() {
        return ResponseEntity.ok(userService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody AdminUpdateUserRequest request) {
        return ResponseEntity.ok(userService.update(id, request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<UserResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UserStatusUpdateRequest request) {
        return ResponseEntity.ok(userService.updateStatus(id, request.getStatus()));
    }

    @PatchMapping("/{id}/subscription")
    public ResponseEntity<SubscriptionResponse> updateUserSubscription(
            @PathVariable Long id,
            @Valid @RequestBody UserPlanUpdateRequest request) {
        return ResponseEntity.ok(subscriptionService.updateUserPlanByAdmin(id, request.getPlanCode()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        userService.softDelete(id);
        return ResponseEntity.noContent().build();
    }
}
