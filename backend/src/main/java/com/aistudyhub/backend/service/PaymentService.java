package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.response.PaymentHistoryResponse;
import com.aistudyhub.backend.dto.response.PaymentStatusResponse;
import com.aistudyhub.backend.entity.PaymentTransaction;
import com.aistudyhub.backend.repository.PaymentTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentTransactionRepository paymentTransactionRepository;

    @Transactional(readOnly = true)
    public List<PaymentHistoryResponse> getPaymentHistory(Long userId) {
        return paymentTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId)
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
}
