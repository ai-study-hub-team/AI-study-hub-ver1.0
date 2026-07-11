package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.response.NotificationResponse;
import com.aistudyhub.backend.entity.Notification;
import com.aistudyhub.backend.entity.NotificationStatus;
import com.aistudyhub.backend.entity.NotificationType;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.exception.NotFoundException;
import com.aistudyhub.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final CurrentUserService currentUserService;

    @Transactional
    public void create(
            User receiver,
            NotificationType type,
            String title,
            String message,
            String targetType,
            Long targetId,
            String actionUrl
    ) {
        if (receiver == null || receiver.getId() == null) {
            return;
        }

        notificationRepository.save(Notification.builder()
                .receiver(receiver)
                .type(type)
                .title(title)
                .message(message)
                .targetType(targetType)
                .targetId(targetId)
                .actionUrl(actionUrl)
                .status(NotificationStatus.ACTIVE)
                .build());
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> getMyNotifications(Pageable pageable) {
        User currentUser = currentUserService.getCurrentUser();
        return notificationRepository
                .findByReceiverIdAndStatusOrderByCreatedAtDesc(
                        currentUser.getId(),
                        NotificationStatus.ACTIVE,
                        pageable
                )
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public long getMyUnreadCount() {
        User currentUser = currentUserService.getCurrentUser();
        return notificationRepository.countByReceiverIdAndStatusAndReadAtIsNull(
                currentUser.getId(),
                NotificationStatus.ACTIVE
        );
    }

    @Transactional
    public NotificationResponse markRead(Long notificationId) {
        User currentUser = currentUserService.getCurrentUser();
        Notification notification = notificationRepository
                .findByIdAndReceiverIdAndStatus(
                        notificationId,
                        currentUser.getId(),
                        NotificationStatus.ACTIVE
                )
                .orElseThrow(() -> new NotFoundException("Notification not found"));

        if (notification.getReadAt() == null) {
            notification.setReadAt(LocalDateTime.now());
        }

        return toResponse(notificationRepository.save(notification));
    }

    @Transactional
    public void markAllRead() {
        User currentUser = currentUserService.getCurrentUser();
        Page<Notification> page = notificationRepository
                .findByReceiverIdAndStatusOrderByCreatedAtDesc(
                        currentUser.getId(),
                        NotificationStatus.ACTIVE,
                        Pageable.unpaged()
                );

        LocalDateTime now = LocalDateTime.now();
        page.getContent().forEach(notification -> {
            if (notification.getReadAt() == null) {
                notification.setReadAt(now);
            }
        });
        notificationRepository.saveAll(page.getContent());
    }

    @Transactional
    public void deleteMyNotification(Long notificationId) {
        User currentUser = currentUserService.getCurrentUser();
        Notification notification = notificationRepository
                .findByIdAndReceiverIdAndStatus(
                        notificationId,
                        currentUser.getId(),
                        NotificationStatus.ACTIVE
                )
                .orElseThrow(() -> new NotFoundException("Notification not found"));

        notification.setStatus(NotificationStatus.DELETED);
        notificationRepository.save(notification);
    }

    private NotificationResponse toResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .type(notification.getType() != null ? notification.getType().name() : null)
                .title(notification.getTitle())
                .message(notification.getMessage())
                .targetType(notification.getTargetType())
                .targetId(notification.getTargetId())
                .actionUrl(notification.getActionUrl())
                .read(notification.getReadAt() != null)
                .readAt(notification.getReadAt())
                .createdAt(notification.getCreatedAt())
                .build();
    }
    
}