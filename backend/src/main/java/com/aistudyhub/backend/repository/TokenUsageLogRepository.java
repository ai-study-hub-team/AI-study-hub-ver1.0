package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.dto.projection.TokenCostAggregate;
import com.aistudyhub.backend.entity.TokenUsageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface TokenUsageLogRepository extends JpaRepository<TokenUsageLog, Long> {
    boolean existsByRequestId(String requestId);

    @Query("""
            select
                sum(l.inputToken) as inputToken,
                sum(l.outputToken) as outputToken,
                sum(l.inputCost) as inputCost,
                sum(l.outputCost) as outputCost,
                sum(l.totalCost) as totalCost
            from TokenUsageLog l
            where l.createdAt >= :fromDateTime
              and l.createdAt < :toDateTime
            """)
    TokenCostAggregate sumTokenCostByCreatedAtRange(
            @Param("fromDateTime") LocalDateTime fromDateTime,
            @Param("toDateTime") LocalDateTime toDateTime
    );

    @Query("""
            select
                sum(l.inputToken) as inputToken,
                sum(l.outputToken) as outputToken,
                sum(l.inputCost) as inputCost,
                sum(l.outputCost) as outputCost,
                sum(l.totalCost) as totalCost
            from TokenUsageLog l
            where l.user.id = :userId
              and l.createdAt >= :fromDateTime
              and l.createdAt < :toDateTime
            """)
    TokenCostAggregate sumTokenCostByUserIdAndCreatedAtRange(
            @Param("userId") Long userId,
            @Param("fromDateTime") LocalDateTime fromDateTime,
            @Param("toDateTime") LocalDateTime toDateTime
    );
}
