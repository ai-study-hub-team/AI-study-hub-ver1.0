package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {
    Optional<PaymentTransaction> findByOrderCode(String orderCode);
    List<PaymentTransaction> findByUserIdOrderByCreatedAtDesc(Long userId);
}
