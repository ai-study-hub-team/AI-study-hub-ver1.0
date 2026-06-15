package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.request.ChangePasswordRequest;
import com.aistudyhub.backend.dto.request.UserUpdateRequest;
import com.aistudyhub.backend.dto.response.UserResponse;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<UserResponse> getAll() {
        return userRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserResponse getById(Long id) {
        return toResponse(findUser(id));
    }

    @Transactional
    public UserResponse update(Long id, UserUpdateRequest request) {
        User user = findUser(id);
        ensureEmailAvailable(request.getEmail(), id);

        user.setFullName(request.getFullName().trim());
        user.setEmail(request.getEmail().trim());

        if (request.getRole() != null && !request.getRole().isBlank()) {
            user.setRole(request.getRole().trim().toUpperCase());
        }

        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            user.setStatus(request.getStatus().trim().toUpperCase());
        }

        user.setUpdatedAt(LocalDateTime.now());
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse updateStatus(Long id, String status) {
        User user = findUser(id);
        user.setStatus(status.trim().toUpperCase());
        user.setUpdatedAt(LocalDateTime.now());
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public void softDelete(Long id) {
        User user = findUser(id);
        user.setStatus("DELETED");
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    @Transactional
    public UserResponse changePassword(Long id, ChangePasswordRequest request) {
        User user = findUser(id);

        if (user.getPassword() != null
                && !user.getPassword().isBlank()
                && !user.getPassword().equals(request.getCurrentPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }

        user.setPassword(request.getNewPassword());
        user.setUpdatedAt(LocalDateTime.now());
        return toResponse(userRepository.save(user));
    }

    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
    }

    private void ensureEmailAvailable(String email, Long currentUserId) {
        userRepository.findByEmail(email.trim())
                .filter(existing -> !existing.getId().equals(currentUserId))
                .ifPresent(existing -> {
                    throw new RuntimeException("Email already exists: " + email);
                });
    }

    private UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .documentCount(user.getDocuments() == null ? 0 : user.getDocuments().size())
                .categoryCount(user.getCategories() == null ? 0 : user.getCategories().size())
                .build();
    }
}
