package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.response.PaymentHistoryResponse;
import com.aistudyhub.backend.dto.response.PaymentStatusResponse;
import com.aistudyhub.backend.entity.PaymentTransaction;
import com.aistudyhub.backend.exception.BadRequestException;
import com.aistudyhub.backend.exception.NotFoundException;
import com.aistudyhub.backend.repository.PaymentTransactionRepository;
import com.aistudyhub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentTransactionRepository paymentTransactionRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<PaymentHistoryResponse> getPaymentHistory(Long userId) {
        return paymentTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toHistoryResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PaymentHistoryResponse> getPaymentHistory(
            Long userId,
            String period,
            LocalDate date,
            LocalDate fromDate,
            LocalDate toDate) {
        if (userId != null && !userRepository.existsById(userId)) {
            throw new NotFoundException("User not found with id: " + userId);
        }

        PaymentHistoryDateRange range = resolveHistoryDateRange(period, date, fromDate, toDate);

        return paymentTransactionRepository.findHistoryForAdmin(
                        userId,
                        range.fromDate().atStartOfDay(),
                        range.toDate().atTime(LocalTime.MAX)
                )
                .stream()
                .map(this::toHistoryResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PaymentStatusResponse getPaymentStatus(Long userId, String orderCode) {
        PaymentTransaction transaction = paymentTransactionRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));

        if (!transaction.getUser().getId().equals(userId)) {
            throw new RuntimeException("Access denied: Transaction does not belong to the current user");
        }

        return PaymentStatusResponse.builder()
                .orderCode(transaction.getOrderCode())
                .status(transaction.getStatus().name())
                .amount(transaction.getAmount())
                .build();
    }

    private PaymentHistoryResponse toHistoryResponse(PaymentTransaction tx) {
        return PaymentHistoryResponse.builder()
                .userId(tx.getUser() != null ? tx.getUser().getId() : null)
                .userEmail(tx.getUser() != null ? tx.getUser().getEmail() : null)
                .userFullName(tx.getUser() != null ? tx.getUser().getFullName() : null)
                .orderCode(tx.getOrderCode())
                .amount(tx.getAmount())
                .provider(tx.getProvider().name())
                .status(tx.getStatus().name())
                .transactionNo(tx.getTransactionNo())
                .paymentTime(tx.getPaymentTime())
                .failureReason(tx.getFailureReason())
                .planCode(tx.getPlanCode())
                .planName(tx.getPlanName())
                .planPrice(tx.getPlanPrice())
                .purchasedDays(tx.getPurchasedDays())
                .createdAt(tx.getCreatedAt())
                .build();
    }

    private PaymentHistoryDateRange resolveHistoryDateRange(
            String period,
            LocalDate date,
            LocalDate fromDate,
            LocalDate toDate) {
        if (period == null || period.isBlank()) {
            throw new BadRequestException("period is required. Allowed values: DAY, WEEK, MONTH, CUSTOM.");
        }

        String normalizedPeriod = period.trim().toUpperCase(Locale.ROOT);
        LocalDate baseDate = date != null ? date : LocalDate.now();

        return switch (normalizedPeriod) {
            case "DAY" -> new PaymentHistoryDateRange(baseDate, baseDate);
            case "WEEK" -> new PaymentHistoryDateRange(
                    baseDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)),
                    baseDate.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY))
            );
            case "MONTH" -> new PaymentHistoryDateRange(
                    baseDate.withDayOfMonth(1),
                    baseDate.withDayOfMonth(baseDate.lengthOfMonth())
            );
            case "CUSTOM" -> {
                if (fromDate == null || toDate == null) {
                    throw new BadRequestException("fromDate and toDate are required when period=CUSTOM.");
                }
                if (fromDate.isAfter(toDate)) {
                    throw new BadRequestException("fromDate must be before or equal to toDate.");
                }
                yield new PaymentHistoryDateRange(fromDate, toDate);
            }
            default -> throw new BadRequestException("Invalid period. Allowed values: DAY, WEEK, MONTH, CUSTOM.");
        };
    }

    private record PaymentHistoryDateRange(LocalDate fromDate, LocalDate toDate) {
    }
}
