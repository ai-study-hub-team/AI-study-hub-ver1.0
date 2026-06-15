package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.ChangePasswordRequest;
import com.aistudyhub.backend.dto.request.UserUpdateRequest;
import com.aistudyhub.backend.dto.response.UserResponse;
import com.aistudyhub.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
public class AccountController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMe(
            @RequestParam(defaultValue = "1") Long userId) {
        return ResponseEntity.ok(userService.getById(userId));
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateMe(
            @RequestParam(defaultValue = "1") Long userId,
            @Valid @RequestBody UserUpdateRequest request) {
        return ResponseEntity.ok(userService.update(userId, request));
    }

    @PutMapping("/change-password")
    public ResponseEntity<UserResponse> changePassword(
            @RequestParam(defaultValue = "1") Long userId,
            @Valid @RequestBody ChangePasswordRequest request) {
        return ResponseEntity.ok(userService.changePassword(userId, request));
    }
}
