package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.request.ChangePasswordRequest;
import com.aistudyhub.backend.dto.request.UserUpdateRequest;
import com.aistudyhub.backend.dto.response.UserResponse;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.enums.UserRole;
import com.aistudyhub.backend.enums.UserStatus;
import com.aistudyhub.backend.exception.EmailAlreadyUsedException;
import com.aistudyhub.backend.exception.ForbiddenException;
import com.aistudyhub.backend.repository.UserRepository;
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
        String normalizedEmail = normalizeEmail(request.getEmail());

        ensureEmailAvailable(normalizedEmail, user.getId());

        user.setFullName(request.getFullName().trim());
        user.setEmail(normalizedEmail);

        if (request.getRole() != null && !request.getRole().isBlank()) {
            user.setRole(UserRole.valueOf(
                    request.getRole().trim().toUpperCase(Locale.ROOT)
            ));
        }

        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            user.setStatus(UserStatus.valueOf(
                    request.getStatus().trim().toUpperCase(Locale.ROOT)
            ));
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
            UserUpdateRequest request
    ) {
        User user = findUserByEmail(authenticatedEmail);
        String normalizedEmail = normalizeEmail(request.getEmail());

        ensureEmailAvailable(normalizedEmail, user.getId());

        user.setFullName(request.getFullName().trim());
        user.setEmail(normalizedEmail);
        user.setUpdatedAt(LocalDateTime.now());

        // Role and status must not be updated from a current-user endpoint.
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse updateStatus(Long id, String status) {
        User user = findUserById(id);
        UserStatus newStatus = UserStatus.valueOf(
                status.trim().toUpperCase(Locale.ROOT)
        );

        user.setStatus(newStatus);
        user.setUpdatedAt(LocalDateTime.now());
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public void softDelete(Long id) {
        User user = findUserById(id);
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
}
