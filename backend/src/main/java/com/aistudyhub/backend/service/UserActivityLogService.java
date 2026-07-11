package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.response.UserActivityLogResponse;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.entity.UserActivityLog;
import com.aistudyhub.backend.exception.NotFoundException;
import com.aistudyhub.backend.repository.UserActivityLogRepository;
import com.aistudyhub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UserActivityLogService {

    private final UserActivityLogRepository activityLogRepository;
    private final UserRepository userRepository;

    @Transactional
    public void record(User user, String action, String targetType, Long targetId, String ipAddress, String userAgent) {
        if (user == null || user.getId() == null) {
            return;
        }

        user.setLastActiveAt(LocalDateTime.now());
        userRepository.save(user);

        activityLogRepository.save(UserActivityLog.builder()
                .user(user)
                .action(action)
                .targetType(targetType)
                .targetId(targetId)
                .ipAddress(truncate(ipAddress, 100))
                .userAgent(truncate(userAgent, 500))
                .build());
    }

    @Transactional(readOnly = true)
    public Page<UserActivityLogResponse> getUserActivities(Long userId, Pageable pageable) {
        if (!userRepository.existsById(userId)) {
            throw new NotFoundException("User not found");
        }
        return activityLogRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::toResponse);
    }

    private UserActivityLogResponse toResponse(UserActivityLog log) {
        return UserActivityLogResponse.builder()
                .id(log.getId())
                .userId(log.getUser() != null ? log.getUser().getId() : null)
                .action(log.getAction())
                .targetType(log.getTargetType())
                .targetId(log.getTargetId())
                .ipAddress(log.getIpAddress())
                .userAgent(log.getUserAgent())
                .createdAt(log.getCreatedAt())
                .build();
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
