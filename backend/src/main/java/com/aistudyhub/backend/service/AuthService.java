package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.request.LoginRequest;
import com.aistudyhub.backend.dto.request.RegisterRequest;
import com.aistudyhub.backend.dto.response.AuthResponse;
import com.aistudyhub.backend.entity.RefreshToken;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.enums.UserRole;
import com.aistudyhub.backend.enums.UserStatus;
import com.aistudyhub.backend.exception.EmailAlreadyUsedException;
import com.aistudyhub.backend.exception.TooManyLoginAttemptsException;
import com.aistudyhub.backend.exception.UnauthorizedException;
import com.aistudyhub.backend.repository.RefreshTokenRepository;
import com.aistudyhub.backend.repository.UserRepository;
import com.aistudyhub.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String INVALID_CREDENTIALS = "Email hoặc mật khẩu không chính xác.";

    private static final String TOO_MANY_LOGIN_ATTEMPTS =
            "Có quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau.";

    private static final String INVALID_REFRESH = "Refresh token is invalid or has expired";

    private static final int MAX_FAILED_LOGIN_ATTEMPTS = 5;

    private static final Duration FAILED_LOGIN_WINDOW = Duration.ofMinutes(15);

    private static final Duration TEMPORARY_LOCK_DURATION = Duration.ofMinutes(15);

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SubscriptionService subscriptionService;
    private final EmailVerificationService emailVerificationService;

    // Chuan hoa email truoc khi xu ly:
    // xoa khoang trang dau/cuoi va chuyen ve chu thuong.
    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }


    // Dang ky tai khoan moi, kiem tra email trung,
    // ma hoa password, luu user vao DB, gan goi free va gui email verify.
    @Transactional
    public com.aistudyhub.backend.dto.response.EmailVerificationResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.getEmail());

        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyUsedException();
        }

        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .role(UserRole.USER)
                .status(UserStatus.ACTIVE)
                .emailVerified(false)
                .provider(com.aistudyhub.backend.enums.UserAuthProvider.LOCAL)
                .build();

        try {
            user = userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {
            // Handles concurrent registration attempts for the same email.
            throw new EmailAlreadyUsedException();
        }

        subscriptionService.assignFreePlan(user);

        return emailVerificationService.createAndSendInitialVerification(user, null, null);
    }

    // Dang nhap bang email/password.
    // Neu thong tin hop le, user ACTIVE va da verify email,
    // thi cap nhat thoi gian hoat dong va tao cap access/refresh token.
    @Transactional(noRollbackFor = {
            UnauthorizedException.class,
            TooManyLoginAttemptsException.class
    })
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.getEmail());

        User user = userRepository.findByEmailForLogin(email)
                .orElseThrow(() ->
                        new UnauthorizedException(INVALID_CREDENTIALS)
                );

        /*
         * Uses one generic response for invalid credentials and inactive
         * accounts to avoid account enumeration.
         */
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException(INVALID_CREDENTIALS);
        }

        LocalDateTime now = LocalDateTime.now();
        clearExpiredTemporaryLock(user, now);
        rejectIfTemporarilyLocked(user, now);

        boolean passwordMatches = passwordEncoder.matches(
                request.getPassword(),
                user.getPassword()
        );

        if (!passwordMatches) {
            recordFailedLogin(user, now);
            userRepository.save(user);

            if (isTemporarilyLocked(user, now)) {
                throwTooManyLoginAttempts(user, now);
            }

            throw new UnauthorizedException(INVALID_CREDENTIALS);
        }

        if (!user.isEmailVerified()) {
            throw new UnauthorizedException("Please verify your email before logging in");
        }

        resetFailedLoginState(user);
        user.setLastLoginAt(now);
        user.setLastActiveAt(now);
        userRepository.save(user);

        return issueTokenPair(user);
    }

    // Dung refresh token de xin cap access token moi.
    // Kiem tra refresh token trong DB, token con han, chua bi revoke,
    // user con ACTIVE va da verify email, sau do revoke token cu va tao token moi.
    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        String tokenHash = jwtService.hashRefreshToken(rawRefreshToken);

        RefreshToken stored = refreshTokenRepository
                .findByTokenForUpdate(tokenHash)
                .orElseThrow(() ->
                        new UnauthorizedException(INVALID_REFRESH)
                );

        boolean expired = !stored.getExpiredAt().isAfter(Instant.now());

        if (stored.isRevoked() || expired) {
            throw new UnauthorizedException(INVALID_REFRESH);
        }

        User user = stored.getUser();

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException(INVALID_REFRESH);
        }

        if (!user.isEmailVerified()) {
            throw new UnauthorizedException(INVALID_REFRESH);
        }
        // Rotates the refresh token by revoking the old token first.
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        return issueTokenPair(user);
    }

    // Dang xuat tren thiet bi hien tai bang cach revoke refresh token.
    // Chi revoke neu refresh token thuoc ve user dang dang nhap.
    @Transactional
    public void logout(
            String rawRefreshToken,
            String authenticatedEmail
    ) {
        String tokenHash = jwtService.hashRefreshToken(rawRefreshToken);

        refreshTokenRepository.findByTokenForUpdate(tokenHash)
                .filter(token ->
                        token.getUser()
                                .getEmail()
                                .equals(authenticatedEmail)
                )
                .ifPresent(token -> {
                    token.setRevoked(true);
                    refreshTokenRepository.save(token);
                });

        // Does not reveal whether the refresh token exists.
    }

    // Tao cap token moi gom access token va refresh token.
    // Refresh token goc duoc tra ve cho frontend,
    // con ban hash cua refresh token duoc luu vao DB de bao mat.
    public AuthResponse issueTokenPair(User user) {
        String accessToken = jwtService.generateAccessToken(user);
        String rawRefreshToken = jwtService.generateRefreshToken();

        RefreshToken stored = RefreshToken.builder()
                .user(user)
                .token(jwtService.hashRefreshToken(rawRefreshToken))
                .revoked(false)
                .expiredAt(
                        Instant.now().plusMillis(
                                jwtService.getRefreshTokenExpirationMillis()
                        )
                )
                .build();

        refreshTokenRepository.save(stored);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(rawRefreshToken)
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .emailVerified(user.isEmailVerified())
                .build();
    }

    private void clearExpiredTemporaryLock(User user, LocalDateTime now) {
        LocalDateTime lockedUntil = user.getLockedUntil();
        if (lockedUntil != null && !lockedUntil.isAfter(now)) {
            resetFailedLoginState(user);
            userRepository.save(user);
        }
    }

    private void rejectIfTemporarilyLocked(User user, LocalDateTime now) {
        if (isTemporarilyLocked(user, now)) {
            throwTooManyLoginAttempts(user, now);
        }
    }

    private boolean isTemporarilyLocked(User user, LocalDateTime now) {
        LocalDateTime lockedUntil = user.getLockedUntil();
        return lockedUntil != null && lockedUntil.isAfter(now);
    }

    private void throwTooManyLoginAttempts(User user, LocalDateTime now) {
        long retryAfterSeconds = Math.max(
                1,
                Duration.between(now, user.getLockedUntil()).getSeconds()
        );
        throw new TooManyLoginAttemptsException(
                TOO_MANY_LOGIN_ATTEMPTS,
                retryAfterSeconds
        );
    }

    private void recordFailedLogin(User user, LocalDateTime now) {
        LocalDateTime lastFailedAt = user.getLastFailedLoginAt();
        boolean insideWindow = lastFailedAt != null
                && !lastFailedAt.plus(FAILED_LOGIN_WINDOW).isBefore(now);

        int attempts = insideWindow
                ? safeFailedLoginAttempts(user) + 1
                : 1;

        user.setFailedLoginAttempts(Math.min(attempts, MAX_FAILED_LOGIN_ATTEMPTS));
        user.setLastFailedLoginAt(now);

        if (!insideWindow) {
            user.setLockedUntil(null);
        }

        if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
            user.setLockedUntil(now.plus(TEMPORARY_LOCK_DURATION));
        }
    }

    private int safeFailedLoginAttempts(User user) {
        return user.getFailedLoginAttempts() == null
                ? 0
                : user.getFailedLoginAttempts();
    }

    private void resetFailedLoginState(User user) {
        user.setFailedLoginAttempts(0);
        user.setLastFailedLoginAt(null);
        user.setLockedUntil(null);
    }

}
