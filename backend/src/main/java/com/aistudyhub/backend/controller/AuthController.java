package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.*;
import com.aistudyhub.backend.dto.response.AuthResponse;
import com.aistudyhub.backend.dto.response.MessageResponse;
import com.aistudyhub.backend.dto.response.UserResponse;
import com.aistudyhub.backend.dto.response.EmailVerificationResponse;
import com.aistudyhub.backend.service.*;
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
    private final PasswordResetService passwordResetService;

    // Dang ky tai khoan moi.
    // Goi AuthService de tao user, gan goi free va gui email verification.
    @PostMapping("/register")
    public ResponseEntity<EmailVerificationResponse> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(authService.register(request));
    }

    // Dang nhap bang email/password.
    // Neu hop le, AuthService se tra access token va refresh token.
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request
    ) {
        return ResponseEntity.ok(authService.login(request));
    }

    // Gui email quen mat khau.
    // Service tao reset token va gui link reset password cho user.
    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest httpRequest
    ) {
        return ResponseEntity.ok(
                passwordResetService.requestPasswordReset(
                        request.getEmail(),
                        httpRequest.getRemoteAddr(),
                        httpRequest.getHeader("User-Agent")
                )
        );
    }

    // Dat lai mat khau bang reset token.
    // Service kiem tra token va cap nhat password moi.
    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponse> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request
    ) {
        return ResponseEntity.ok(
                passwordResetService.resetPassword(request)
        );
    }

    // Xac thuc email bang token tren link email verification.
    @GetMapping("/verify-email")
    public ResponseEntity<EmailVerificationResponse> verifyEmail(
            @RequestParam String token
    ) {
        return ResponseEntity.ok(emailVerificationService.verifyEmail(token));
    }

    // Gui lai email verification cho user chua xac thuc email.
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

    // Dang nhap bang Google.
    // Service kiem tra Google token, tao/tim user va tra token cua he thong.
    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(
            @Valid @RequestBody GoogleLoginRequest request
    ) {
        return ResponseEntity.ok(googleAuthService.loginWithGoogle(request));
    }

    // Cap lai access token bang refresh token.
    // AuthService kiem tra refresh token va tao cap token moi.
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @Valid @RequestBody RefreshTokenRequest request
    ) {
        return ResponseEntity.ok(
                authService.refresh(request.getRefreshToken())
        );
    }

    // Dang xuat thiet bi hien tai.
    // Can access token hop le de lay authenticated email,
    // sau do revoke refresh token duoc gui len.
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

    // Lay thong tin user dang dang nhap.
    // Can access token hop le, Spring inject Authentication tu SecurityContext.
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
