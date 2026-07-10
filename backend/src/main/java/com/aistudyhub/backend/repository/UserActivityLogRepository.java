package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.UserActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserActivityLogRepository extends JpaRepository<UserActivityLog, Long> {
    Page<UserActivityLog> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    java.util.Optional<UserActivityLog> findTopByUserIdOrderByCreatedAtDesc(Long userId);

}
