package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.SubscriptionPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionPlanRepository extends JpaRepository<SubscriptionPlan, Long> {
    Optional<SubscriptionPlan> findFirstByCodeAndIsActiveTrueOrderByVersionDesc(String code);
    Optional<SubscriptionPlan> findFirstByCodeOrderByVersionDesc(String code);
    boolean existsByCodeAndIsActiveTrue(String code);
    List<SubscriptionPlan> findByIsActiveTrue();
}
