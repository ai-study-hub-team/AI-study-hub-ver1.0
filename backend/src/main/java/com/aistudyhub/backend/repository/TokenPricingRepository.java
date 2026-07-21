package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.TokenPricing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TokenPricingRepository extends JpaRepository<TokenPricing, Long> {
    Optional<TokenPricing> findFirstByActiveTrueOrderByUpdatedAtDesc();
}
