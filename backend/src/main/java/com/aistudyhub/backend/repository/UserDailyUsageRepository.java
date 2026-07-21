package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.dto.projection.TokenUsageDailyAggregate;
import com.aistudyhub.backend.dto.projection.TokenCostAggregate;
import com.aistudyhub.backend.entity.UserDailyUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserDailyUsageRepository extends JpaRepository<UserDailyUsage, Long> {
    Optional<UserDailyUsage> findByUserIdAndUsageDate(Long userId, LocalDate usageDate);

    @Query("""
            select
                coalesce(sum(u.inputToken), 0) as inputToken,
                coalesce(sum(u.outputToken), 0) as outputToken
            from UserDailyUsage u
            where u.usageDate between :fromDate and :toDate
            """)
    TokenCostAggregate sumTokenCostByDateRange(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );

    @Query("""
            select
                coalesce(sum(u.inputToken), 0) as inputToken,
                coalesce(sum(u.outputToken), 0) as outputToken
            from UserDailyUsage u
            where u.user.id = :userId
              and u.usageDate between :fromDate and :toDate
            """)
    TokenCostAggregate sumTokenCostByUserIdAndDateRange(
            @Param("userId") Long userId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );

    @Query("""
            select
                u.usageDate as usageDate,
                coalesce(sum(u.chatTokens), 0) as chatTokens,
                coalesce(sum(u.summaryTokens), 0) as summaryTokens,
                coalesce(sum(u.quizTokens), 0) as quizTokens,
                coalesce(sum(u.extractTokens), 0) as extractTokens,
                coalesce(sum(u.totalTokens), 0) as totalTokens,
                coalesce(sum(u.totalTokens), 0) + coalesce(sum(u.extractTokens), 0) as overallTokens
            from UserDailyUsage u
            where u.usageDate between :fromDate and :toDate
            group by u.usageDate
            order by u.usageDate
            """)
    List<TokenUsageDailyAggregate> aggregateAllUsersByDateRange(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );

    @Query("""
            select
                u.usageDate as usageDate,
                coalesce(sum(u.chatTokens), 0) as chatTokens,
                coalesce(sum(u.summaryTokens), 0) as summaryTokens,
                coalesce(sum(u.quizTokens), 0) as quizTokens,
                coalesce(sum(u.extractTokens), 0) as extractTokens,
                coalesce(sum(u.totalTokens), 0) as totalTokens,
                coalesce(sum(u.totalTokens), 0) + coalesce(sum(u.extractTokens), 0) as overallTokens
            from UserDailyUsage u
            where u.user.id = :userId
              and u.usageDate between :fromDate and :toDate
            group by u.usageDate
            order by u.usageDate
            """)
    List<TokenUsageDailyAggregate> aggregateUserByDateRange(
            @Param("userId") Long userId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );
}
