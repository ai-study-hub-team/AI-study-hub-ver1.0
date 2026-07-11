package com.aistudyhub.backend.service;

import com.aistudyhub.backend.config.EmailVerificationProperties;
import com.aistudyhub.backend.dto.response.EmailVerificationResponse;
import com.aistudyhub.backend.entity.EmailVerificationToken;
import com.aistudyhub.backend.entity.EmailVerificationTokenType;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.enums.UserStatus;
import com.aistudyhub.backend.exception.BadRequestException;
import com.aistudyhub.backend.exception.NotFoundException;
import com.aistudyhub.backend.repository.EmailVerificationTokenRepository;
import com.aistudyhub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Locale;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final EmailVerificationTokenType TOKEN_TYPE =
            EmailVerificationTokenType.EMAIL_VERIFICATION;

    private final EmailVerificationTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final ResendEmailService resendEmailService;
    private final EmailVerificationProperties properties;

    /**
     * Được gọi ngay sau khi đăng ký user thành công.
     * Tạo token mới, vô hiệu token cũ nếu có, gửi email xác thực.
     */
    @Transactional
    public EmailVerificationResponse createAndSendInitialVerification(
            User user,
            String createdIp,
            String userAgent
    ) {
        createAndSendToken(user, createdIp, userAgent, 0);

        return EmailVerificationResponse.builder()
                .message("Registration successful. Please verify your email before logging in")
                .email(user.getEmail())
                .emailVerified(user.isEmailVerified())
                .nextAction("VERIFY_EMAIL")
                .build();
    }

    /**
     * Xác thực email bằng token.
     * Chỉ chấp nhận token mới nhất, chưa dùng, chưa hết hạn.
     */
    @Transactional
    public EmailVerificationResponse verifyEmail(String rawToken) {
        String tokenValue = normalizeToken(rawToken);
        LocalDateTime now = LocalDateTime.now();

        EmailVerificationToken token = tokenRepository.findByToken(hashToken(tokenValue))
                .orElseThrow(() -> new BadRequestException("Invalid verification token"));

        if (token.isUsed()) {
            throw new BadRequestException("Verification token has already been used");
        }

        if (!token.getExpiredAt().isAfter(now)) {
            throw new BadRequestException("Verification token has expired");
        }

        User user = token.getUser();
        if (user == null || user.getId() == null) {
            throw new NotFoundException("User not found");
        }

        EmailVerificationToken latestToken = tokenRepository
                .findTopByUserIdAndTokenTypeOrderByCreatedAtDescIdDesc(
                        user.getId(),
                        TOKEN_TYPE
                )
                .orElseThrow(() -> new BadRequestException("Invalid verification token"));

        if (!latestToken.getId().equals(token.getId())) {
            throw new BadRequestException("A newer verification email has been sent");
        }

        if (user.isEmailVerified()) {
            markTokenUsed(token, now);
            return EmailVerificationResponse.builder()
                    .message("Email is already verified")
                    .email(user.getEmail())
                    .emailVerified(true)
                    .nextAction("LOGIN")
                    .build();
        }

        user.setEmailVerified(true);
        user.setEmailVerifiedAt(now);

        if (user.getStatus() == UserStatus.PENDING) {
            user.setStatus(UserStatus.ACTIVE);
        }

        markTokenUsed(token, now);
        userRepository.save(user);

        return EmailVerificationResponse.builder()
                .message("Email verified successfully")
                .email(user.getEmail())
                .emailVerified(true)
                .nextAction("LOGIN")
                .build();
    }

    /**
     * Gửi lại email xác thực.
     * Không tiết lộ email có tồn tại hay không.
     */
    @Transactional
    public EmailVerificationResponse resendVerificationEmail(
            String email,
            String createdIp,
            String userAgent
    ) {
        String normalizedEmail = normalizeEmail(email);

        return userRepository.findByEmail(normalizedEmail)
                .map(user -> resendForExistingUser(user, createdIp, userAgent))
                .orElseGet(() -> EmailVerificationResponse.builder()
                        .message("If the email exists and is not verified, a verification email has been sent")
                        .email(normalizedEmail)
                        .emailVerified(false)
                        .nextAction("CHECK_EMAIL")
                        .build());
    }

    private EmailVerificationResponse resendForExistingUser(
            User user,
            String createdIp,
            String userAgent
    ) {
        if (user.isEmailVerified()) {
            return EmailVerificationResponse.builder()
                    .message("Email is already verified")
                    .email(user.getEmail())
                    .emailVerified(true)
                    .nextAction("LOGIN")
                    .build();
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
                long waitSeconds = cooldownSeconds - elapsedSeconds;
                throw new BadRequestException(
                        "Please wait " + waitSeconds + " seconds before requesting another verification email"
                );
            }
        }

        int resendCount = latestToken == null
                ? 1
                : latestToken.getResendCount() + 1;

        createAndSendToken(user, createdIp, userAgent, resendCount);

        return EmailVerificationResponse.builder()
                .message("Verification email has been resent")
                .email(user.getEmail())
                .emailVerified(false)
                .nextAction("CHECK_EMAIL")
                .build();
    }

    private void createAndSendToken(
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
        resendEmailService.sendEmailVerificationEmail(
                user,
                rawToken,
                token.getExpiredAt()
        );
    }

    private void markTokenUsed(EmailVerificationToken token, LocalDateTime usedAt) {
        token.setUsed(true);
        token.setUsedAt(usedAt);
        tokenRepository.save(token);
    }

    private String generateToken() {
        byte[] bytes = new byte[48];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(bytes);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeToken(String token) {
        if (token == null || token.isBlank()) {
            throw new BadRequestException("Verification token is required");
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
