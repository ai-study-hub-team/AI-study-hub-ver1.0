package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.request.LoginRequest;
import com.aistudyhub.backend.dto.request.RegisterRequest;
import com.aistudyhub.backend.dto.response.AuthResponse;
import com.aistudyhub.backend.entity.RefreshToken;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.enums.UserRole;
import com.aistudyhub.backend.enums.UserStatus;
import com.aistudyhub.backend.exception.EmailAlreadyUsedException;
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
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String INVALID_CREDENTIALS =
            "Incorrect email or password";

    private static final String INVALID_REFRESH =
            "Refresh token is invalid or has expired";

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SubscriptionService subscriptionService;
    private final EmailVerificationService emailVerificationService;

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

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.getEmail());

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new UnauthorizedException(INVALID_CREDENTIALS)
                );

        boolean passwordMatches = passwordEncoder.matches(
                request.getPassword(),
                user.getPassword()
        );

        /*
         * Uses one generic response for invalid credentials and inactive
         * accounts to avoid account enumeration.
         */
        if (!passwordMatches || user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException(INVALID_CREDENTIALS);
        }

        if (!user.isEmailVerified()) {
            throw new UnauthorizedException("Please verify your email before logging in");
        }

        user.setLastLoginAt(java.time.LocalDateTime.now());
        user.setLastActiveAt(java.time.LocalDateTime.now());
        userRepository.save(user);

        return issueTokenPair(user);
    }

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

    @Transactional
    public void logoutAll(String authenticatedEmail) {
        User user = userRepository
                .findByEmail(normalizeEmail(authenticatedEmail))
                .orElseThrow(() ->
                        new UnauthorizedException(
                                "Unable to authenticate user"
                        )
                );

        refreshTokenRepository.revokeAllActiveByUserId(user.getId());
    }

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

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
