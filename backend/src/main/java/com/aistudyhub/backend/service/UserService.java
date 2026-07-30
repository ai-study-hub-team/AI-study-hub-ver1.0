package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.request.*;
import com.aistudyhub.backend.dto.response.UserResponse;
import com.aistudyhub.backend.entity.SubscriptionPlan;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.entity.UserSubscription;
import com.aistudyhub.backend.enums.UserRole;
import com.aistudyhub.backend.enums.UserStatus;
import com.aistudyhub.backend.exception.EmailAlreadyUsedException;
import com.aistudyhub.backend.exception.ForbiddenException;
import com.aistudyhub.backend.repository.UserSubscriptionRepository;
import com.aistudyhub.backend.repository.UserRepository;
import com.aistudyhub.backend.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AvatarStorageService avatarStorageService;
    private final CurrentUserService currentUserService;
    private final RolePolicyService rolePolicyService;
    private final UserSubscriptionRepository userSubscriptionRepository;
    private final SubscriptionService subscriptionService;

    @Transactional(readOnly = true)
    public List<UserResponse> getAll() {
        User currentUser = currentUserService.getCurrentUser();

        List<User> visibleUsers = userRepository.findAll()
                .stream()
                .filter(user -> rolePolicyService.canSeeUserInManagement(currentUser, user))
                .toList();

        Map<Long, UserSubscription> subscriptionsByUserId =
                getSubscriptionsByUserId(visibleUsers);

        return visibleUsers.stream()
                .map(user -> toResponse(
                        user,
                        getCurrentPlan(user, subscriptionsByUserId)
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public UserResponse getById(Long id) {
        User currentUser = currentUserService.getCurrentUser();
        User targetUser = findUserById(id);
        rolePolicyService.requireCanManageAccount(currentUser, targetUser);
        return toResponse(targetUser);
    }

    @Transactional(readOnly = true)
    public UserResponse getByEmail(String email) {
        User user = findUserByEmail(email);
        return toResponse(user);
    }

    /**
     * Updates a user from the admin user-management API.
     */
    @Transactional
    public UserResponse update(Long id, AdminUpdateUserRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        User user = findUserById(id);

        rolePolicyService.requireCanManageAccount(currentUser, user);

        user.setFullName(request.getFullName().trim());
        user.setAvatarUrl(trimToNull(request.getAvatarUrl()));
        user.setUpdatedAt(LocalDateTime.now());

        User saved = userRepository.save(user);
        return toResponse(saved);
    }

    /**
     * Updates only fields that a signed-in user is allowed to change.
     */
    @Transactional
    public UserResponse updateCurrentUser(
            String authenticatedEmail,
            UpdateProfileRequest request
    ) {
        User user = findUserByEmail(authenticatedEmail);

        user.setFullName(request.getFullName().trim());
        user.setPhone(trimToNull(request.getPhone()));
        user.setUpdatedAt(LocalDateTime.now());

        User saved = userRepository.save(user);
        return toResponse(saved);
    }


    @Transactional
    public UserResponse updateStatus(Long id, String status) {
        User currentUser = currentUserService.getCurrentUser();
        User user = findUserById(id);

        rolePolicyService.requireCanManageAccount(currentUser, user);

        UserStatus newStatus = UserStatus.valueOf(
                status.trim().toUpperCase(Locale.ROOT)
        );

        ensureNotRemovingLastActiveAdmin(user, user.getRole(), newStatus);
        user.setStatus(newStatus);
        user.setUpdatedAt(LocalDateTime.now());
        User saved = userRepository.save(user);
        return toResponse(saved);
    }

    @Transactional
    public void softDelete(Long id) {
        User currentUser = currentUserService.getCurrentUser();
        User user = findUserById(id);

        rolePolicyService.requireCanManageAccount(currentUser, user);
        ensureNotRemovingLastActiveAdmin(user, user.getRole(), UserStatus.INACTIVE);

        user.setStatus(UserStatus.INACTIVE);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    @Transactional
    public UserResponse changePassword(
            Long id,
            ChangePasswordRequest request
    ) {
        return changePasswordForUser(
                findUserById(id),
                request
        );
    }

    @Transactional
    public UserResponse changeCurrentUserPassword(
            String authenticatedEmail,
            ChangePasswordRequest request
    ) {
        return changePasswordForUser(
                findUserByEmail(authenticatedEmail),
                request
        );
    }

    private UserResponse changePasswordForUser(
            User user,
            ChangePasswordRequest request
    ) {
        boolean passwordMatches = passwordEncoder.matches(
                request.getCurrentPassword(),
                user.getPassword()
        );

        if (!passwordMatches) {
            throw new ForbiddenException(
                    "Incorrect current password"
            );
        }

        user.setPassword(
                passwordEncoder.encode(request.getNewPassword())
        );
        user.setFailedLoginAttempts(0);
        user.setLastFailedLoginAt(null);
        user.setLockedUntil(null);
        user.setUpdatedAt(LocalDateTime.now());
        User saved = userRepository.save(user);
        return toResponse(saved);
    }

    private User findUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("User not found with id: " + id)
                );
    }

    private User findUserByEmail(String email) {
        String normalizedEmail = normalizeEmail(email);
        return userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() ->
                        new RuntimeException("User not found")
                );
    }

    private void ensureEmailAvailable(
            String normalizedEmail,
            Long currentUserId
    ) {
        userRepository.findByEmail(normalizedEmail)
                .filter(existing ->
                        !existing.getId().equals(currentUserId)
                )
                .ifPresent(existing -> {
                    throw new EmailAlreadyUsedException();
                });
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private UserResponse toResponse(User user) {
        return toResponse(user, getCurrentPlan(user));
    }

    private UserResponse toResponse(User user, String currentPlan) {
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .status(user.getStatus().name())
                .currentPlan(currentPlan)
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .emailVerified(user.isEmailVerified())
                .avatarUrl(user.getAvatarUrl())
                .phone(user.getPhone())
                .totalStorageUsedBytes(
                        user.getTotalStorageUsedBytes() == null
                                ? 0L
                                : user.getTotalStorageUsedBytes()
                )
                .documentCount(
                        user.getDocuments() == null
                                ? 0
                                : user.getDocuments().size()
                )
                .categoryCount(
                        user.getCategories() == null
                                ? 0
                                : user.getCategories().size()
                )
                .build();
    }

    private Map<Long, UserSubscription> getSubscriptionsByUserId(List<User> users) {
        List<Long> userIds = users.stream()
                .map(User::getId)
                .toList();

        if (userIds.isEmpty()) {
            return Map.of();
        }

        return userSubscriptionRepository.findByUserIdIn(userIds)
                .stream()
                .collect(Collectors.toMap(
                        subscription -> subscription.getUser().getId(),
                        Function.identity()
                ));
    }

    private String getCurrentPlan(User user) {
        if (user == null || user.getId() == null) {
            return null;
        }

        return userSubscriptionRepository.findByUserId(user.getId())
                .map(this::getPlanCode)
                .orElse(null);
    }

    private String getCurrentPlan(
            User user,
            Map<Long, UserSubscription> subscriptionsByUserId
    ) {
        if (user == null || user.getId() == null) {
            return null;
        }

        return getPlanCode(subscriptionsByUserId.get(user.getId()));
    }

    private String getPlanCode(UserSubscription subscription) {
        if (subscription == null) {
            return null;
        }

        SubscriptionPlan plan = subscription.getPlan();
        return plan != null ? plan.getCode() : null;
    }

    private void ensureNotRemovingLastActiveAdmin(
            User currentUser,
            UserRole newRole,
            UserStatus newStatus
    ) {
        boolean currentlyActiveAdmin =
                currentUser.getRole() == UserRole.ADMIN
                        && currentUser.getStatus() == UserStatus.ACTIVE;

        boolean remainsActiveAdmin =
                newRole == UserRole.ADMIN
                        && newStatus == UserStatus.ACTIVE;

        if (!currentlyActiveAdmin || remainsActiveAdmin) {
            return;
        }

        long activeAdminCount = userRepository.countByRoleAndStatus(
                UserRole.ADMIN,
                UserStatus.ACTIVE
        );

        if (activeAdminCount <= 1) {
            throw new BadRequestException("Cannot remove or disable the last active admin");
        }
    }

    @Transactional
    public UserResponse updateCurrentUserAvatar(
            String authenticatedEmail,
            MultipartFile file
    ) {
        User user = findUserByEmail(authenticatedEmail);
        String oldAvatarUrl = user.getAvatarUrl();

        String newAvatarUrl = avatarStorageService.storeLocalAvatar(file);
        user.setAvatarUrl(newAvatarUrl);
        user.setUpdatedAt(LocalDateTime.now());

        User saved = userRepository.save(user);
        avatarStorageService.deleteLocalAvatarByUrl(oldAvatarUrl);

        return toResponse(saved);
    }

    @Transactional
    public UserResponse createManager(CreateManagerRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        rolePolicyService.requireAdmin(
                currentUser,
                "Only administrators can create manager accounts"
        );

        String email = normalizeEmail(request.getEmail());

        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyUsedException();
        }

        User manager = User.builder()
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .role(UserRole.MANAGER)
                .status(UserStatus.ACTIVE)
                .emailVerified(true)
                .emailVerifiedAt(LocalDateTime.now())
                .provider(com.aistudyhub.backend.enums.UserAuthProvider.LOCAL)
                .build();

        try {
            manager = userRepository.saveAndFlush(manager);
        } catch (DataIntegrityViolationException ex) {
            throw new EmailAlreadyUsedException();
        }

        log.info(
                "Admin userId={} created manager userId={} email={}",
                currentUser.getId(),
                manager.getId(),
                manager.getEmail()
        );

        subscriptionService.assignProPlan(manager);

        return toResponse(manager);
    }

    @Transactional
    public UserResponse createUserByAdmin(AdminCreateUserRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        rolePolicyService.requireAdmin(
                currentUser,
                "Only administrators can create user accounts"
        );

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
                .emailVerified(true)
                .emailVerifiedAt(LocalDateTime.now())
                .provider(com.aistudyhub.backend.enums.UserAuthProvider.LOCAL)
                .build();

        try {
            user = userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {
            throw new EmailAlreadyUsedException();
        }

        subscriptionService.assignFreePlan(user);

        log.info(
                "Admin userId={} created regular userId={} email={}",
                currentUser.getId(),
                user.getId(),
                user.getEmail()
        );

        return toResponse(user);
    }
}
