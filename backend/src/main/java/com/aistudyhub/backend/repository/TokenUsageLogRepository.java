package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.TokenUsageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TokenUsageLogRepository extends JpaRepository<TokenUsageLog, Long> {
    boolean existsByRequestId(String requestId);
}
