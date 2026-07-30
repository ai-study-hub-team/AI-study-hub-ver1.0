package com.aistudyhub.backend.auth;

import com.aistudyhub.backend.dto.request.ChangePasswordRequest;
import com.aistudyhub.backend.dto.request.GoogleLoginRequest;
import com.aistudyhub.backend.dto.request.LoginRequest;
import com.aistudyhub.backend.dto.request.ResetPasswordRequest;
import com.aistudyhub.backend.entity.EmailVerificationToken;
import com.aistudyhub.backend.entity.EmailVerificationTokenType;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.enums.UserAuthProvider;
import com.aistudyhub.backend.enums.UserRole;
import com.aistudyhub.backend.enums.UserStatus;
import com.aistudyhub.backend.exception.BadRequestException;
import com.aistudyhub.backend.exception.TooManyLoginAttemptsException;
import com.aistudyhub.backend.exception.UnauthorizedException;
import com.aistudyhub.backend.repository.EmailVerificationTokenRepository;
import com.aistudyhub.backend.repository.RefreshTokenRepository;
import com.aistudyhub.backend.repository.UserRepository;
import com.aistudyhub.backend.repository.UserSubscriptionRepository;
import com.aistudyhub.backend.security.JwtService;
import com.aistudyhub.backend.service.*;
import com.aistudyhub.backend.config.GoogleOAuthProperties;
import com.aistudyhub.backend.config.PasswordResetProperties;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.data.jpa.repository.Lock;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthLoginFailurePolicyTest {

    private static final String EMAIL = "user@example.com";
    private static final String PASSWORD = "correct-password";
    private static final String WRONG_PASSWORD = "wrong-password";

    @Mock UserRepository userRepository;
    @Mock RefreshTokenRepository refreshTokenRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtService jwtService;
    @Mock SubscriptionService subscriptionService;
    @Mock EmailVerificationService emailVerificationService;

    private AuthService authService;
    private User user;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository,
                refreshTokenRepository,
                passwordEncoder,
                jwtService,
                subscriptionService,
                emailVerificationService
        );

        user = activeUser();
        lenient().when(userRepository.findByEmailForLogin(EMAIL)).thenReturn(Optional.of(user));
    }

    @Test
    void firstWrongPasswordRecordsSingleFailureAndReturnsUnauthorized() {
        when(passwordEncoder.matches(WRONG_PASSWORD, user.getPassword())).thenReturn(false);

        assertThatThrownBy(() -> authService.login(loginRequest(WRONG_PASSWORD)))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Email hoặc mật khẩu không chính xác.");

        assertThat(user.getFailedLoginAttempts()).isEqualTo(1);
        assertThat(user.getLastFailedLoginAt()).isNotNull();
        assertThat(user.getLockedUntil()).isNull();
        verify(userRepository).save(user);
    }

    @Test
    void fourWrongPasswordsInsideWindowDoNotLockAccount() {
        when(passwordEncoder.matches(WRONG_PASSWORD, user.getPassword())).thenReturn(false);

        for (int i = 0; i < 4; i++) {
            assertThatThrownBy(() -> authService.login(loginRequest(WRONG_PASSWORD)))
                    .isInstanceOf(UnauthorizedException.class);
        }

        assertThat(user.getFailedLoginAttempts()).isEqualTo(4);
        assertThat(user.getLockedUntil()).isNull();
    }

    @Test
    void fifthWrongPasswordLocksAccountButThresholdRequestRemainsUnauthorized() {
        when(passwordEncoder.matches(WRONG_PASSWORD, user.getPassword())).thenReturn(false);

        for (int i = 0; i < 5; i++) {
            assertThatThrownBy(() -> authService.login(loginRequest(WRONG_PASSWORD)))
                    .isInstanceOf(UnauthorizedException.class);
        }

        assertThat(user.getFailedLoginAttempts()).isEqualTo(5);
        assertThat(user.getLockedUntil()).isAfter(LocalDateTime.now());
        verify(jwtService, never()).generateAccessToken(any());
    }

    @Test
    void loginWhileLockedReturnsTooManyRequestsWithoutIssuingToken() {
        user.setFailedLoginAttempts(5);
        user.setLastFailedLoginAt(LocalDateTime.now().minusMinutes(1));
        user.setLockedUntil(LocalDateTime.now().plusMinutes(10));

        assertThatThrownBy(() -> authService.login(loginRequest(PASSWORD)))
                .isInstanceOf(TooManyLoginAttemptsException.class)
                .hasMessage("Có quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau.");

        verify(passwordEncoder, never()).matches(any(), any());
        verify(jwtService, never()).generateAccessToken(any());
    }

    @Test
    void expiredLockIsClearedAndCurrentLoginCanSucceed() {
        user.setFailedLoginAttempts(5);
        user.setLastFailedLoginAt(LocalDateTime.now().minusMinutes(20));
        user.setLockedUntil(LocalDateTime.now().minusSeconds(1));
        stubSuccessfulPasswordAndTokens();

        var response = authService.login(loginRequest(PASSWORD));

        assertThat(response.getAccessToken()).isEqualTo("access-token");
        assertThat(user.getFailedLoginAttempts()).isZero();
        assertThat(user.getLastFailedLoginAt()).isNull();
        assertThat(user.getLockedUntil()).isNull();
    }

    @Test
    void successfulLoginResetsFailureStateAndIssuesTokens() {
        user.setFailedLoginAttempts(3);
        user.setLastFailedLoginAt(LocalDateTime.now().minusMinutes(2));
        user.setLockedUntil(null);
        stubSuccessfulPasswordAndTokens();

        var response = authService.login(loginRequest(PASSWORD));

        assertThat(response.getAccessToken()).isEqualTo("access-token");
        assertThat(response.getRefreshToken()).isEqualTo("refresh-token");
        assertThat(user.getFailedLoginAttempts()).isZero();
        assertThat(user.getLastFailedLoginAt()).isNull();
        assertThat(user.getLockedUntil()).isNull();
    }

    @Test
    void wrongPasswordsOutsideWindowStartCounterAgainAtOne() {
        user.setFailedLoginAttempts(4);
        user.setLastFailedLoginAt(LocalDateTime.now().minusMinutes(16));
        when(passwordEncoder.matches(WRONG_PASSWORD, user.getPassword())).thenReturn(false);

        assertThatThrownBy(() -> authService.login(loginRequest(WRONG_PASSWORD)))
                .isInstanceOf(UnauthorizedException.class);

        assertThat(user.getFailedLoginAttempts()).isEqualTo(1);
        assertThat(user.getLockedUntil()).isNull();
    }

    @Test
    void adminLockedAccountIsStillRejectedAndTemporaryLockStateIsNotAutoCleared() {
        user.setStatus(UserStatus.LOCKED);
        user.setFailedLoginAttempts(5);
        user.setLastFailedLoginAt(LocalDateTime.now().minusMinutes(20));
        user.setLockedUntil(LocalDateTime.now().minusMinutes(1));

        assertThatThrownBy(() -> authService.login(loginRequest(PASSWORD)))
                .isInstanceOf(UnauthorizedException.class);

        assertThat(user.getStatus()).isEqualTo(UserStatus.LOCKED);
        assertThat(user.getFailedLoginAttempts()).isEqualTo(5);
        assertThat(user.getLockedUntil()).isNotNull();
        verify(passwordEncoder, never()).matches(any(), any());
    }

    @Test
    void loginUsesPessimisticWriteLockRepositoryMethod() throws Exception {
        Method method = UserRepository.class.getMethod("findByEmailForLogin", String.class);
        Lock lock = method.getAnnotation(Lock.class);

        assertThat(lock).isNotNull();
        assertThat(lock.value()).isEqualTo(LockModeType.PESSIMISTIC_WRITE);

        when(passwordEncoder.matches(WRONG_PASSWORD, user.getPassword())).thenReturn(false);
        assertThatThrownBy(() -> authService.login(loginRequest(WRONG_PASSWORD)))
                .isInstanceOf(UnauthorizedException.class);
        verify(userRepository).findByEmailForLogin(EMAIL);
    }

    @Test
    void successfulPasswordResetClearsTemporaryLockState() {
        EmailVerificationTokenRepository tokenRepository = mock(EmailVerificationTokenRepository.class);
        SmtpEmailService smtpEmailService = mock(SmtpEmailService.class);
        PasswordResetProperties properties = new PasswordResetProperties();
        PasswordResetService service = new PasswordResetService(
                userRepository,
                tokenRepository,
                smtpEmailService,
                passwordEncoder,
                refreshTokenRepository,
                properties
        );
        user.setFailedLoginAttempts(5);
        user.setLastFailedLoginAt(LocalDateTime.now().minusMinutes(1));
        user.setLockedUntil(LocalDateTime.now().plusMinutes(10));
        String rawToken = "reset-token";
        EmailVerificationToken token = passwordResetToken(100L, rawToken, user);
        when(tokenRepository.findByToken(sha256(rawToken))).thenReturn(Optional.of(token));
        when(tokenRepository.findTopByUserIdAndTokenTypeOrderByCreatedAtDescIdDesc(
                user.getId(),
                EmailVerificationTokenType.PASSWORD_RESET
        )).thenReturn(Optional.of(token));
        when(passwordEncoder.encode("new-password")).thenReturn("new-hash");

        service.resetPassword(resetPasswordRequest(rawToken));

        assertThat(user.getPassword()).isEqualTo("new-hash");
        assertThat(user.getFailedLoginAttempts()).isZero();
        assertThat(user.getLastFailedLoginAt()).isNull();
        assertThat(user.getLockedUntil()).isNull();
    }

    @Test
    void failedPasswordResetDoesNotClearTemporaryLockState() {
        EmailVerificationTokenRepository tokenRepository = mock(EmailVerificationTokenRepository.class);
        SmtpEmailService smtpEmailService = mock(SmtpEmailService.class);
        PasswordResetProperties properties = new PasswordResetProperties();
        PasswordResetService service = new PasswordResetService(
                userRepository,
                tokenRepository,
                smtpEmailService,
                passwordEncoder,
                refreshTokenRepository,
                properties
        );
        user.setFailedLoginAttempts(5);
        user.setLastFailedLoginAt(LocalDateTime.now().minusMinutes(1));
        user.setLockedUntil(LocalDateTime.now().plusMinutes(10));
        when(tokenRepository.findByToken(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.resetPassword(resetPasswordRequest("bad-token")))
                .isInstanceOf(BadRequestException.class);

        assertThat(user.getFailedLoginAttempts()).isEqualTo(5);
        assertThat(user.getLastFailedLoginAt()).isNotNull();
        assertThat(user.getLockedUntil()).isNotNull();
    }

    @Test
    void successfulChangePasswordClearsTemporaryLockState() {
        UserSubscriptionRepository userSubscriptionRepository = mock(UserSubscriptionRepository.class);
        UserService service = new UserService(
                userRepository,
                passwordEncoder,
                mock(AvatarStorageService.class),
                mock(CurrentUserService.class),
                mock(RolePolicyService.class),
                userSubscriptionRepository,
                subscriptionService
        );
        user.setFailedLoginAttempts(5);
        user.setLastFailedLoginAt(LocalDateTime.now().minusMinutes(1));
        user.setLockedUntil(LocalDateTime.now().plusMinutes(10));
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(PASSWORD, user.getPassword())).thenReturn(true);
        when(passwordEncoder.encode("new-password")).thenReturn("new-hash");
        when(userRepository.save(user)).thenReturn(user);
        when(userSubscriptionRepository.findByUserId(user.getId())).thenReturn(Optional.empty());

        service.changeCurrentUserPassword(EMAIL, changePasswordRequest());

        assertThat(user.getPassword()).isEqualTo("new-hash");
        assertThat(user.getFailedLoginAttempts()).isZero();
        assertThat(user.getLastFailedLoginAt()).isNull();
        assertThat(user.getLockedUntil()).isNull();
    }

    @Test
    void googleOAuthFailureDoesNotIncrementLocalPasswordFailureCounter() {
        GoogleOAuthProperties properties = new GoogleOAuthProperties();
        properties.setClientId("");
        GoogleAuthService googleAuthService = new GoogleAuthService(
                properties,
                userRepository,
                passwordEncoder,
                authService,
                subscriptionService
        );
        GoogleLoginRequest request = new GoogleLoginRequest();
        request.setIdToken("invalid");

        assertThatThrownBy(() -> googleAuthService.loginWithGoogle(request))
                .isInstanceOf(BadRequestException.class);

        assertThat(user.getFailedLoginAttempts()).isZero();
        verify(userRepository, never()).save(any());
    }

    private User activeUser() {
        return User.builder()
                .id(10L)
                .fullName("Test User")
                .email(EMAIL)
                .password("encoded-password")
                .role(UserRole.USER)
                .status(UserStatus.ACTIVE)
                .emailVerified(true)
                .provider(UserAuthProvider.LOCAL)
                .failedLoginAttempts(0)
                .createdAt(LocalDateTime.now().minusDays(1))
                .updatedAt(LocalDateTime.now().minusDays(1))
                .build();
    }

    private LoginRequest loginRequest(String password) {
        LoginRequest request = new LoginRequest();
        request.setEmail("  USER@example.com ");
        request.setPassword(password);
        return request;
    }

    private void stubSuccessfulPasswordAndTokens() {
        when(passwordEncoder.matches(PASSWORD, user.getPassword())).thenReturn(true);
        when(jwtService.generateAccessToken(user)).thenReturn("access-token");
        when(jwtService.generateRefreshToken()).thenReturn("refresh-token");
        when(jwtService.hashRefreshToken("refresh-token")).thenReturn("refresh-hash");
        when(jwtService.getRefreshTokenExpirationMillis()).thenReturn(60_000L);
    }

    private ResetPasswordRequest resetPasswordRequest(String token) {
        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken(token);
        request.setNewPassword("new-password");
        request.setConfirmPassword("new-password");
        return request;
    }

    private ChangePasswordRequest changePasswordRequest() {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword(PASSWORD);
        request.setNewPassword("new-password");
        return request;
    }

    private EmailVerificationToken passwordResetToken(Long id, String rawToken, User user) {
        return EmailVerificationToken.builder()
                .id(id)
                .user(user)
                .token(sha256(rawToken))
                .tokenType(EmailVerificationTokenType.PASSWORD_RESET)
                .expiredAt(LocalDateTime.now().plusMinutes(10))
                .used(false)
                .createdAt(LocalDateTime.now().minusMinutes(1))
                .updatedAt(LocalDateTime.now().minusMinutes(1))
                .lastSentAt(LocalDateTime.now().minusMinutes(1))
                .build();
    }

    private String sha256(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
