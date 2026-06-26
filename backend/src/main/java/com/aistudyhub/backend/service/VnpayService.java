package com.aistudyhub.backend.service;

import com.aistudyhub.backend.config.VnpayProperties;
import com.aistudyhub.backend.entity.PaymentTransaction;
import com.aistudyhub.backend.entity.SubscriptionPlan;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.enums.PaymentProvider;
import com.aistudyhub.backend.enums.PaymentStatus;
import com.aistudyhub.backend.exception.PaymentException;
import com.aistudyhub.backend.repository.PaymentTransactionRepository;
import com.aistudyhub.backend.repository.SubscriptionPlanRepository;
import com.aistudyhub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class VnpayService {

    private final VnpayProperties vnpayProperties;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final SubscriptionPlanRepository subscriptionPlanRepository;
    private final UserRepository userRepository;
    private final SubscriptionService subscriptionService;

    @Transactional
    public String createPaymentUrl(Long userId, String planCode) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        SubscriptionPlan plan = subscriptionPlanRepository.findByCode(planCode)
                .orElseThrow(() -> new RuntimeException("Plan not found: " + planCode));

        if (!plan.getIsActive()) {
            throw new RuntimeException("Plan is currently inactive and cannot be purchased.");
        }

        // We assume a 30-day purchase for now. Could be dynamic later.
        int purchasedDays = 30;
        BigDecimal amount = plan.getPrice();
        String orderCode = "VNPAY_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();

        // Save PENDING transaction with snapshot data
        PaymentTransaction transaction = PaymentTransaction.builder()
                .user(user)
                .plan(plan)
                .planCode(plan.getCode())
                .planName(plan.getName())
                .planPrice(plan.getPrice())
                .purchasedDays(purchasedDays)
                .orderCode(orderCode)
                .amount(amount)
                .provider(PaymentProvider.VNPAY)
                .status(PaymentStatus.PENDING)
                .build();
        paymentTransactionRepository.save(transaction);

        // Build VNPAY URL
        long vnpAmount = amount.longValue() * 100L;
        String vnpTxnTime = DateTimeFormatter.ofPattern("yyyyMMddHHmmss").format(LocalDateTime.now());
        String vnpExpire = DateTimeFormatter.ofPattern("yyyyMMddHHmmss").format(LocalDateTime.now().plusMinutes(15));

        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_Version", vnpayProperties.getVersion());
        vnpParams.put("vnp_Command", vnpayProperties.getCommand());
        vnpParams.put("vnp_TmnCode", vnpayProperties.getTmnCode());
        vnpParams.put("vnp_Amount", String.valueOf(vnpAmount));
        vnpParams.put("vnp_CurrCode", "VND");
        vnpParams.put("vnp_TxnRef", orderCode);
        vnpParams.put("vnp_OrderInfo", "Thanh toan don hang " + orderCode);
        vnpParams.put("vnp_OrderType", "other");
        vnpParams.put("vnp_Locale", "vn");
        vnpParams.put("vnp_ReturnUrl", vnpayProperties.getReturnUrl());
        vnpParams.put("vnp_IpAddr", "127.0.0.1"); // In production, get real IP
        vnpParams.put("vnp_CreateDate", vnpTxnTime);
        vnpParams.put("vnp_ExpireDate", vnpExpire);

        List<String> fieldNames = new ArrayList<>(vnpParams.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();

        try {
            for (String fieldName : fieldNames) {
                String fieldValue = vnpParams.get(fieldName);
                if (fieldValue != null && !fieldValue.isEmpty()) {
                    hashData.append(fieldName).append('=').append(URLEncoder.encode(fieldValue, StandardCharsets.UTF_8.toString())).append('&');
                    query.append(URLEncoder.encode(fieldName, StandardCharsets.UTF_8.toString())).append('=')
                            .append(URLEncoder.encode(fieldValue, StandardCharsets.UTF_8.toString())).append('&');
                }
            }
            if (hashData.length() > 0) {
                hashData.setLength(hashData.length() - 1);
            }
            if (query.length() > 0) {
                query.setLength(query.length() - 1);
            }
            String secureHash = hmacSHA512(vnpayProperties.getHashSecret(), hashData.toString());
            query.append("&vnp_SecureHash=").append(secureHash);
        } catch (Exception e) {
            log.error("Error creating VNPAY URL", e);
            throw new RuntimeException("Could not create payment URL");
        }

        return vnpayProperties.getPayUrl() + "?" + query.toString();
    }

    @Transactional
    public void processReturn(Map<String, String> params) {
        String secureHash = params.get("vnp_SecureHash");
        if (secureHash == null) {
            throw new PaymentException("Missing secure hash");
        }

        params.remove("vnp_SecureHash");
        params.remove("vnp_SecureHashType");

        List<String> fieldNames = new ArrayList<>(params.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();

        try {
            for (String fieldName : fieldNames) {
                String fieldValue = params.get(fieldName);
                if (fieldValue != null && !fieldValue.isEmpty()) {
                    hashData.append(fieldName).append('=').append(URLEncoder.encode(fieldValue, StandardCharsets.UTF_8.toString())).append('&');
                }
            }
            if (hashData.length() > 0) {
                hashData.setLength(hashData.length() - 1);
            }
            
            String calculatedHash = hmacSHA512(vnpayProperties.getHashSecret(), hashData.toString());
            if (!calculatedHash.equals(secureHash)) {
                throw new PaymentException("Invalid checksum");
            }

            String orderCode = params.get("vnp_TxnRef");
            String responseCode = params.get("vnp_ResponseCode");
            String transactionNo = params.get("vnp_TransactionNo");
            String rawResponse = params.toString();

            PaymentTransaction transaction = paymentTransactionRepository.findByOrderCode(orderCode)
                    .orElseThrow(() -> new PaymentException("Transaction not found: " + orderCode));

            if (transaction.getStatus() != PaymentStatus.PENDING) {
                log.warn("Transaction {} is already processed (Status: {})", orderCode, transaction.getStatus());
                return;
            }

            transaction.setTransactionNo(transactionNo);
            transaction.setRawResponse(rawResponse);
            transaction.setPaymentTime(LocalDateTime.now());

            if ("00".equals(responseCode)) {
                transaction.setStatus(PaymentStatus.SUCCESS);
                paymentTransactionRepository.save(transaction);
                log.info("Payment SUCCESS for order: {}", orderCode);
                
                // Grant subscription
                subscriptionService.processSuccessfulPayment(
                        transaction.getUser().getId(), 
                        transaction.getPlanCode(), 
                        transaction.getPurchasedDays()
                );
            } else {
                transaction.setStatus(PaymentStatus.FAILED);
                transaction.setFailureReason("VNPAY Response Code: " + responseCode);
                paymentTransactionRepository.save(transaction);
                log.info("Payment FAILED for order: {}. Reason: {}", orderCode, responseCode);
            }

        } catch (PaymentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error processing VNPAY return", e);
            throw new PaymentException("Error processing payment return");
        }
    }

    private String hmacSHA512(String key, String data) {
        try {
            Mac hmac512 = Mac.getInstance("HmacSHA512");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
            hmac512.init(secretKey);
            byte[] result = hmac512.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(2 * result.length);
            for (byte b : result) {
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();
        } catch (Exception ex) {
            throw new RuntimeException("Failed to calculate HMAC-SHA512", ex);
        }
    }
}
