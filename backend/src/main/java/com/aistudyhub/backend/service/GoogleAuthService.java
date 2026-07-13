package com.aistudyhub.backend.service;

import com.aistudyhub.backend.config.GoogleOAuthProperties;
import com.aistudyhub.backend.dto.request.GoogleLoginRequest;
import com.aistudyhub.backend.dto.response.AuthResponse;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.enums.UserAuthProvider;
import com.aistudyhub.backend.enums.UserRole;
import com.aistudyhub.backend.enums.UserStatus;
import com.aistudyhub.backend.exception.BadRequestException;
import com.aistudyhub.backend.exception.UnauthorizedException;
import com.aistudyhub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GoogleAuthService {

    private static final String GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";

    private final GoogleOAuthProperties googleOAuthProperties;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;
    private final SubscriptionService subscriptionService;

    @Transactional
    public AuthResponse loginWithGoogle(GoogleLoginRequest request) {
        Jwt jwt = decodeAndValidate(request.getIdToken());

        String email = normalizeEmail(jwt.getClaimAsString("email"));
        String providerId = jwt.getSubject();
        String fullName = firstNonBlank(jwt.getClaimAsString("name"), email);
        String avatarUrl = jwt.getClaimAsString("picture");
        Boolean emailVerified = jwt.getClaim("email_verified");

        if (!Boolean.TRUE.equals(emailVerified)) {
            throw new UnauthorizedException("Google email is not verified");
        }

        User user = userRepository.findByEmail(email).orElse(null);
        boolean newUser = false;

        if (user == null) {
            user = User.builder()
                    .email(email)
                    .fullName(fullName)
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .role(UserRole.USER)
                    .status(UserStatus.ACTIVE)
                    .emailVerified(true)
                    .emailVerifiedAt(LocalDateTime.now())
                    .provider(UserAuthProvider.GOOGLE)
                    .providerId(providerId)
                    .avatarUrl(avatarUrl)
                    .build();
            newUser = true;
        } else {
            if (user.getStatus() != UserStatus.ACTIVE) {
                throw new UnauthorizedException("Account is not active");
            }

            user.setProvider(UserAuthProvider.GOOGLE);
            user.setProviderId(providerId);
            user.setEmailVerified(true);
            if (user.getEmailVerifiedAt() == null) {
                user.setEmailVerifiedAt(LocalDateTime.now());
            }
            if ((user.getAvatarUrl() == null || user.getAvatarUrl().isBlank())
                    && avatarUrl != null
                    && !avatarUrl.isBlank()) {
                user.setAvatarUrl(avatarUrl);
            }
        }

        user.setLastLoginAt(LocalDateTime.now());
        user.setLastActiveAt(LocalDateTime.now());
        user = userRepository.save(user);

        if (newUser) {
            subscriptionService.assignFreePlan(user);
        }

        return authService.issueTokenPair(user);
    }

    private Jwt decodeAndValidate(String idToken) {
        if (googleOAuthProperties.getClientId() == null || googleOAuthProperties.getClientId().isBlank()) {
            throw new BadRequestException("google.oauth.client-id is not configured");
        }

        JwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(GOOGLE_JWKS_URI).build();

        Jwt jwt;
        try {
            jwt = decoder.decode(idToken);
        } catch (JwtException ex) {
            throw new UnauthorizedException("Invalid Google idToken");
        }

        String issuer = jwt.getIssuer() != null ? jwt.getIssuer().toString() : null;
        if (!"https://accounts.google.com".equals(issuer) && !"accounts.google.com".equals(issuer)) {
            throw new UnauthorizedException("Invalid Google issuer");
        }

        Object aud = jwt.getClaims().get("aud");
        String clientId = googleOAuthProperties.getClientId();
        boolean audienceValid = aud instanceof String value
                ? clientId.equals(value)
                : aud instanceof Collection<?> values && values.contains(clientId);

        if (!audienceValid) {
            throw new UnauthorizedException("Invalid Google audience");
        }

        return jwt;
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new UnauthorizedException("Google email is missing");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String firstNonBlank(String first, String fallback) {
        return first != null && !first.isBlank() ? first.trim() : fallback;
    }
}
