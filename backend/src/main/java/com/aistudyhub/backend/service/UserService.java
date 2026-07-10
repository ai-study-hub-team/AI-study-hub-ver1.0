package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.request.ChangePasswordRequest;
import com.aistudyhub.backend.dto.request.UserUpdateRequest;
import com.aistudyhub.backend.dto.response.UserResponse;
import com.aistudyhub.backend.dto.request.UpdateProfileRequest;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.enums.UserRole;
import com.aistudyhub.backend.enums.UserStatus;
import com.aistudyhub.backend.exception.EmailAlreadyUsedException;
import com.aistudyhub.backend.exception.ForbiddenException;
import com.aistudyhub.backend.repository.UserRepository;
import com.aistudyhub.backend.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UserResponse> getAll() {
        return userRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserResponse getById(Long id) {
        return toResponse(findUserById(id));
    }

    @Transactional(readOnly = true)
    public UserResponse getByEmail(String email) {
        return toResponse(findUserByEmail(email));
    }

    /**
     * Updates a user from the admin user-management API.
     */
    @Transactional
    public UserResponse update(Long id, UserUpdateRequest request) {
        User user = findUserById(id);
        user.setFullName(request.getFullName().trim());

        if (request.getRole() != null && !request.getRole().isBlank()) {
            UserRole newRole = UserRole.valueOf(
                    request.getRole().trim().toUpperCase(Locale.ROOT)
            );
            ensureNotRemovingLastActiveAdmin(user, newRole, user.getStatus());
            user.setRole(newRole);
        }

        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            UserStatus newStatus = UserStatus.valueOf(
                    request.getStatus().trim().toUpperCase(Locale.ROOT)
            );
            ensureNotRemovingLastActiveAdmin(user, user.getRole(), newStatus);
            user.setStatus(newStatus);
        }

        user.setUpdatedAt(LocalDateTime.now());
        return toResponse(userRepository.save(user));
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
        user.setAvatarUrl(trimToNull(request.getAvatarUrl()));
        user.setPhone(trimToNull(request.getPhone()));
        user.setUpdatedAt(LocalDateTime.now());

        return toResponse(userRepository.save(user));
    }


    @Transactional
    public UserResponse updateStatus(Long id, String status) {
        User user = findUserById(id);
        UserStatus newStatus = UserStatus.valueOf(
                status.trim().toUpperCase(Locale.ROOT)
        );

        ensureNotRemovingLastActiveAdmin(user, user.getRole(), newStatus);
        user.setStatus(newStatus);
        user.setUpdatedAt(LocalDateTime.now());
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public void softDelete(Long id) {
        User user = findUserById(id);
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
        user.setUpdatedAt(LocalDateTime.now());
        return toResponse(userRepository.save(user));
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
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .status(user.getStatus().name())
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
}
