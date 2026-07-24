package com.aistudyhub.backend.service;

import com.aistudyhub.backend.config.PasswordResetProperties;
import com.aistudyhub.backend.dto.request.ResetPasswordRequest;
import com.aistudyhub.backend.dto.response.MessageResponse;
import com.aistudyhub.backend.entity.EmailVerificationToken;
import com.aistudyhub.backend.entity.EmailVerificationTokenType;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.enums.UserStatus;
import com.aistudyhub.backend.exception.BadRequestException;
import com.aistudyhub.backend.repository.EmailVerificationTokenRepository;
import com.aistudyhub.backend.repository.RefreshTokenRepository;
import com.aistudyhub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final EmailVerificationTokenType TOKEN_TYPE =
            EmailVerificationTokenType.PASSWORD_RESET;
    private static final String GENERIC_FORGOT_PASSWORD_MESSAGE =
            "If the email exists, a password reset link has been sent";

    private final UserRepository userRepository;
    private final EmailVerificationTokenRepository tokenRepository;
    private final SmtpEmailService smtpEmailService;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetProperties properties;

    @Transactional
    public MessageResponse requestPasswordReset(
            String rawEmail,
            String createdIp,
            String userAgent
    ) {
        String email = normalizeEmail(rawEmail);
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null
                || user.getStatus() != UserStatus.ACTIVE
                || !user.isEmailVerified()) {
            return genericForgotPasswordResponse();
        }

        LocalDateTime now = LocalDateTime.now();
        EmailVerificationToken latestToken = tokenRepository
                .findTopByUserIdAndTokenTypeOrderByCreatedAtDescIdDesc(
                        user.getId(),
                        TOKEN_TYPE
                )
                .orElse(null);

        if (latestToken != null && latestToken.getLastSentAt() != null) {
            long elapsedSeconds = Duration.between(
                    latestToken.getLastSentAt(),
                    now
            ).getSeconds();
            long cooldownSeconds = Math.max(0, properties.getResendCooldownSeconds());

            if (elapsedSeconds < cooldownSeconds) {
                return genericForgotPasswordResponse();
            }
        }

        int resendCount = latestToken == null
                ? 0
                : latestToken.getResendCount() + 1;

        createAndSendResetToken(user, createdIp, userAgent, resendCount);

        return genericForgotPasswordResponse();
    }

    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Password confirmation does not match");
        }

        String tokenValue = normalizeToken(request.getToken());
        LocalDateTime now = LocalDateTime.now();

        EmailVerificationToken token = tokenRepository
                .findByToken(hashToken(tokenValue))
                .orElseThrow(() ->
                        new BadRequestException("Invalid or expired password reset token")
                );

        if (token.getTokenType() != TOKEN_TYPE) {
            throw new BadRequestException("Invalid or expired password reset token");
        }

        if (token.isUsed()) {
            throw new BadRequestException("Password reset token has already been used");
        }

        if (!token.getExpiredAt().isAfter(now)) {
            throw new BadRequestException("Password reset token has expired");
        }

        User user = token.getUser();
        if (user == null || user.getId() == null) {
            throw new BadRequestException("Invalid or expired password reset token");
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BadRequestException("Account is not active");
        }

        EmailVerificationToken latestToken = tokenRepository
                .findTopByUserIdAndTokenTypeOrderByCreatedAtDescIdDesc(
                        user.getId(),
                        TOKEN_TYPE
                )
                .orElseThrow(() ->
                        new BadRequestException("Invalid or expired password reset token")
                );

        if (!latestToken.getId().equals(token.getId())) {
            throw new BadRequestException("A newer password reset email has been sent");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(now);
        userRepository.save(user);

        tokenRepository.markUnusedTokensAsUsed(user.getId(), TOKEN_TYPE, now);
        refreshTokenRepository.revokeAllActiveByUserId(user.getId());

        return new MessageResponse("Password reset successfully");
    }

    private void createAndSendResetToken(
            User user,
            String createdIp,
            String userAgent,
            int resendCount
    ) {
        LocalDateTime now = LocalDateTime.now();
        tokenRepository.markUnusedTokensAsUsed(user.getId(), TOKEN_TYPE, now);

        String rawToken = generateToken();

        EmailVerificationToken token = EmailVerificationToken.builder()
                .user(user)
                .token(hashToken(rawToken))
                .tokenType(TOKEN_TYPE)
                .expiredAt(now.plusMinutes(Math.max(1, properties.getTokenExpirationMinutes())))
                .used(false)
                .createdIp(truncate(createdIp, 100))
                .userAgent(truncate(userAgent, 500))
                .resendCount(Math.max(0, resendCount))
                .lastSentAt(now)
                .build();

        tokenRepository.save(token);
        smtpEmailService.sendPasswordResetEmail(
                user,
                rawToken,
                token.getExpiredAt()
        );
    }

    private MessageResponse genericForgotPasswordResponse() {
        return new MessageResponse(GENERIC_FORGOT_PASSWORD_MESSAGE);
    }

    private String generateToken() {
        byte[] bytes = new byte[48];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(bytes);
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Email address cannot be blank");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeToken(String token) {
        if (token == null || token.isBlank()) {
            throw new BadRequestException("Reset token is required");
        }
        return token.trim();
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        if (trimmed.length() <= maxLength) {
            return trimmed;
        }

        return trimmed.substring(0, maxLength);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }
}
