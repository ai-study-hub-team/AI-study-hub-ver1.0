package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.EmailNotificationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EmailNotificationLogRepository extends JpaRepository<EmailNotificationLog, Long> {
}
