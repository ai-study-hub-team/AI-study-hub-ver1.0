package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.LoginRequest;
import com.aistudyhub.backend.dto.request.LogoutRequest;
import com.aistudyhub.backend.dto.request.RefreshTokenRequest;
import com.aistudyhub.backend.dto.request.RegisterRequest;
import com.aistudyhub.backend.dto.response.AuthResponse;
import com.aistudyhub.backend.dto.response.MessageResponse;
import com.aistudyhub.backend.dto.response.UserResponse;
import com.aistudyhub.backend.dto.request.GoogleLoginRequest;
import com.aistudyhub.backend.dto.request.ResendVerificationEmailRequest;
import com.aistudyhub.backend.dto.response.EmailVerificationResponse;
import com.aistudyhub.backend.service.GoogleAuthService;
import com.aistudyhub.backend.service.AuthService;
import com.aistudyhub.backend.service.UserService;
import com.aistudyhub.backend.service.EmailVerificationService;
import jakarta.servlet.http.HttpServletRequest;
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
    private final GoogleAuthService googleAuthService;
    private final EmailVerificationService emailVerificationService;

    @PostMapping("/register")
    public ResponseEntity<EmailVerificationResponse> register(
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

    @GetMapping("/verify-email")
    public ResponseEntity<EmailVerificationResponse> verifyEmail(
            @RequestParam String token
    ) {
        return ResponseEntity.ok(emailVerificationService.verifyEmail(token));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<EmailVerificationResponse> resendVerification(
            @Valid @RequestBody ResendVerificationEmailRequest request,
            HttpServletRequest httpRequest
    ) {
        return ResponseEntity.ok(
                emailVerificationService.resendVerificationEmail(
                        request.getEmail(),
                        httpRequest.getRemoteAddr(),
                        httpRequest.getHeader("User-Agent")
                )
        );
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(
            @Valid @RequestBody GoogleLoginRequest request
    ) {
        return ResponseEntity.ok(googleAuthService.loginWithGoogle(request));
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
