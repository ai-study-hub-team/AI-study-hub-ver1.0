package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.UserDailyUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface UserDailyUsageRepository extends JpaRepository<UserDailyUsage, Long> {
    Optional<UserDailyUsage> findByUserIdAndUsageDate(Long userId, LocalDate usageDate);
}
