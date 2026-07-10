package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.response.RecentUserActivityResponse;
import com.aistudyhub.backend.entity.*;
import com.aistudyhub.backend.enums.UserRole;
import com.aistudyhub.backend.enums.UserStatus;
import com.aistudyhub.backend.repository.DocumentReportRepository;
import com.aistudyhub.backend.repository.DocumentRepository;
import com.aistudyhub.backend.repository.DocumentShareRepository;
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
public class AdminRecentUserActivityService {

    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final DocumentShareRepository documentShareRepository;
    private final DocumentReportRepository documentReportRepository;
    private final UserActivityLogRepository userActivityLogRepository;

    @Transactional(readOnly = true)
    public Page<RecentUserActivityResponse> getRecentActivities(
            String keyword,
            UserRole role,
            UserStatus status,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            Pageable pageable
    ) {
        String normalizedKeyword = keyword == null || keyword.isBlank() ? null : keyword.trim();
        return userRepository.searchRecentUsers(
                        normalizedKeyword,
                        role,
                        status,
                        fromDate,
                        toDate,
                        pageable
                )
                .map(this::toResponse);
    }

    private RecentUserActivityResponse toResponse(User user) {
        String lastAction = userActivityLogRepository
                .findTopByUserIdOrderByCreatedAtDesc(user.getId())
                .map(UserActivityLog::getAction)
                .orElse(null);

        return RecentUserActivityResponse.builder()
                .userId(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .accountStatus(user.getStatus() != null ? user.getStatus().name() : null)
                .lastLoginAt(user.getLastLoginAt())
                .lastActiveAt(user.getLastActiveAt())
                .lastAction(lastAction)
                .totalDocuments(documentRepository.countByUserIdAndStatus(user.getId(), DocumentStatus.ACTIVE))
                .totalSharedDocuments(documentShareRepository.countBySharedWithIdAndStatus(
                        user.getId(),
                        DocumentShareStatus.ACTIVE
                ))
                .totalReports(documentReportRepository.countByReporterId(user.getId()))
                .build();
    }
}
