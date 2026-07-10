package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.Notification;
import com.aistudyhub.backend.entity.NotificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByReceiverIdAndStatusOrderByCreatedAtDesc(
            Long receiverId,
            NotificationStatus status,
            Pageable pageable
    );

    long countByReceiverIdAndStatusAndReadAtIsNull(
            Long receiverId,
            NotificationStatus status
    );

    Optional<Notification> findByIdAndReceiverIdAndStatus(
            Long id,
            Long receiverId,
            NotificationStatus status
    );
}