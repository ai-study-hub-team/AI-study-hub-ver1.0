package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.UserSubscription;
import com.aistudyhub.backend.enums.SubscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, Long> {
    Optional<UserSubscription> findByUserId(Long userId);
    @Query("select subscription from UserSubscription subscription join fetch subscription.plan where subscription.user.id in :userIds")
    List<UserSubscription> findByUserIdIn(@Param("userIds") List<Long> userIds);
    List<UserSubscription> findAllByStatusAndEndDateBefore(SubscriptionStatus status, LocalDateTime date);
    List<UserSubscription> findAllByStatusAndEndDateBetween(
            SubscriptionStatus status,
            LocalDateTime from,
            LocalDateTime to
    );
}
