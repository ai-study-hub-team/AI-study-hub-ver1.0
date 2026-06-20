package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.LoginRequest;
import com.aistudyhub.backend.dto.request.LogoutRequest;
import com.aistudyhub.backend.dto.request.RefreshTokenRequest;
import com.aistudyhub.backend.dto.request.RegisterRequest;
import com.aistudyhub.backend.dto.response.AuthResponse;
import com.aistudyhub.backend.dto.response.MessageResponse;
import com.aistudyhub.backend.dto.response.UserResponse;
import com.aistudyhub.backend.service.AuthService;
import com.aistudyhub.backend.service.UserService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request
    ) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @Valid @RequestBody RefreshTokenRequest request
    ) {
        return ResponseEntity.ok(
                authService.refresh(request.getRefreshToken())
        );
    }

    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/logout")
    public ResponseEntity<MessageResponse> logout(
            @Valid @RequestBody LogoutRequest request,
            Authentication authentication
    ) {
        authService.logout(
                request.getRefreshToken(),
                authentication.getName()
        );

        return ResponseEntity.ok(
                new MessageResponse("Logout successful")
        );
    }

    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                userService.getByEmail(authentication.getName())
        );
    }
}
