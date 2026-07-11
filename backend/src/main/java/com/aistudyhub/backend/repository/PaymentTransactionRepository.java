package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.dto.projection.AdminRevenueDailyAggregate;
import com.aistudyhub.backend.entity.PaymentTransaction;
import com.aistudyhub.backend.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {
    Optional<PaymentTransaction> findByOrderCode(String orderCode);
    Optional<PaymentTransaction> findByVnpTxnRef(String vnpTxnRef);
    List<PaymentTransaction> findByUserIdOrderByCreatedAtDesc(Long userId);
    long countByStatus(PaymentStatus status);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM PaymentTransaction p WHERE p.status = com.aistudyhub.backend.enums.PaymentStatus.SUCCESS")
    BigDecimal calculateTotalSuccessfulRevenue();

    @Query(value = """
            SELECT
                CAST(COALESCE(p.payment_time, p.updated_at, p.created_at) AS date) AS revenueDate,
                COALESCE(SUM(p.amount), 0) AS totalRevenue,
                COUNT(*) AS successfulTransactionCount
            FROM payment_transactions p
            WHERE p.status = 'SUCCESS'
              AND CAST(COALESCE(p.payment_time, p.updated_at, p.created_at) AS date) BETWEEN :fromDate AND :toDate
            GROUP BY CAST(COALESCE(p.payment_time, p.updated_at, p.created_at) AS date)
            ORDER BY revenueDate
            """, nativeQuery = true)
    List<AdminRevenueDailyAggregate> aggregateSuccessfulRevenueByDateRange(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );
}
