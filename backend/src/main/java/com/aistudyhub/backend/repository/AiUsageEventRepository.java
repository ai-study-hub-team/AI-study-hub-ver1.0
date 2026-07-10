package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.AiUsageEvent;
import com.aistudyhub.backend.enums.AiFeatureType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AiUsageEventRepository extends JpaRepository<AiUsageEvent, Long> {

    /**
     * Returns grouped counts per feature type for a user within a time window.
     * Each element is an Object[]{AiFeatureType, Long count}.
     * Features with no events are NOT included — zero-filling is done in the service.
     *
     * Example JPQL:
     * <pre>
     * SELECT e.featureType, COUNT(e)
     * FROM AiUsageEvent e
     * WHERE e.user.id = :userId
     *   AND e.createdAt >= :from
     *   AND e.createdAt < :to
     * GROUP BY e.featureType
     * </pre>
     */
    @Query("SELECT e.featureType, COUNT(e) " +
           "FROM AiUsageEvent e " +
           "WHERE e.user.id = :userId " +
           "AND e.createdAt >= :from " +
           "AND e.createdAt < :to " +
           "GROUP BY e.featureType")
    List<Object[]> countByFeatureTypeInRange(
            @Param("userId") Long userId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    /**
     * Returns all events for a user within a time window — used for chart bucketing in Java.
     * Ordered ascending so they can be streamed and grouped by bucket label.
     */
    @Query("SELECT e FROM AiUsageEvent e " +
           "WHERE e.user.id = :userId " +
           "AND e.createdAt >= :from " +
           "AND e.createdAt < :to " +
           "ORDER BY e.createdAt ASC")
    List<AiUsageEvent> findByUserInRange(
            @Param("userId") Long userId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
