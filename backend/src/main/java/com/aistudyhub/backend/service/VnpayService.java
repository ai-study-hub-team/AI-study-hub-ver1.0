package com.aistudyhub.backend.service;

import com.aistudyhub.backend.config.VnpayConfig;
import com.aistudyhub.backend.config.VnpayProperties;
import com.aistudyhub.backend.dto.response.VnpayPaymentCreation;
import com.aistudyhub.backend.dto.response.VnpayReturnResult;
import com.aistudyhub.backend.entity.NotificationType;
import com.aistudyhub.backend.entity.PaymentTransaction;
import com.aistudyhub.backend.entity.SubscriptionPlan;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.enums.PaymentProvider;
import com.aistudyhub.backend.enums.PaymentStatus;
import com.aistudyhub.backend.enums.UserRole;
import com.aistudyhub.backend.exception.ForbiddenException;
import com.aistudyhub.backend.exception.PaymentException;
import com.aistudyhub.backend.repository.PaymentTransactionRepository;
import com.aistudyhub.backend.repository.SubscriptionPlanRepository;
import com.aistudyhub.backend.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.time.LocalDateTime;
import java.util.*;

/**
 * VNPAY payment service — handles payment URL creation and return processing.
 * <p>
 * The payment URL generation logic is ported from the official {@code ajaxServlet.java}.
 * The return processing follows the official VNPAY validation flow.
 * All cryptographic operations are delegated to {@link VnpayConfig}.
 * </p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VnpayService {

    private final VnpayProperties vnpayProperties;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final SubscriptionPlanRepository subscriptionPlanRepository;
    private final UserRepository userRepository;
    private final SubscriptionService subscriptionService;
    private final SmtpEmailService smtpEmailService;
    private final NotificationService notificationService;

    /**
     * Create a VNPAY payment URL for a subscription plan purchase.
     * <p>
     * Follows the official {@code ajaxServlet.doPost()} flow:
     * <ol>
     *   <li>Build parameter map with all required VNPAY fields</li>
     *   <li>Sort parameters alphabetically</li>
     *   <li>URL-encode values for both hash data and query string</li>
     *   <li>Generate HMAC-SHA512 secure hash</li>
     *   <li>Append secure hash to query string</li>
     * </ol>
     * </p>
     *
     * @param userId  the ID of the user making the payment
     * @param planCode the subscription plan code to purchase
     * @param request the HTTP request (used to extract client IP)
     * @return payment creation details including the redirect URL and internal order code
     */
    @Transactional
    public VnpayPaymentCreation createPayment(Long userId, String planCode, HttpServletRequest request) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() != UserRole.USER) {
            throw new ForbiddenException("Only regular users can purchase subscription plans");
        }

        SubscriptionPlan plan = subscriptionPlanRepository
                .findFirstByCodeAndIsActiveTrueOrderByVersionDesc(planCode)
                .orElseThrow(() -> new RuntimeException("Plan not found: " + planCode));

        if (!plan.getIsActive()) {
            throw new RuntimeException("Plan is currently inactive and cannot be purchased.");
        }

        int purchasedDays = resolvePurchasedDays(plan);
        BigDecimal amount = plan.getPrice();

        // --- Match official ajaxServlet.java ---

        String vnp_Version = vnpayProperties.getVersion();
        String vnp_Command = vnpayProperties.getCommand();
        String orderType = "other";

        // Amount * 100 — matches official: Integer.parseInt(req.getParameter("amount"))*100
        long vnpAmount = amount.longValue() * 100L;

        // TxnRef — matches official: Config.getRandomNumber(8)
        String vnp_TxnRef = VnpayConfig.getRandomNumber(8);

        // IP address — matches official: Config.getIpAddress(req)
        String vnp_IpAddr = VnpayConfig.getIpAddress(request);

        String vnp_TmnCode = vnpayProperties.getTmnCode();

        // Internal order code for our system
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
                .vnpTxnRef(vnp_TxnRef)
                .amount(amount)
                .provider(PaymentProvider.VNPAY)
                .status(PaymentStatus.PENDING)
                .build();
        paymentTransactionRepository.save(transaction);

        // --- Build parameter map (matches official ajaxServlet.java) ---

        Map<String, String> vnp_Params = new HashMap<>();
        vnp_Params.put("vnp_Version", vnp_Version);
        vnp_Params.put("vnp_Command", vnp_Command);
        vnp_Params.put("vnp_TmnCode", vnp_TmnCode);
        vnp_Params.put("vnp_Amount", String.valueOf(vnpAmount));
        vnp_Params.put("vnp_CurrCode", "VND");

        // BankCode — official sample adds only if not empty; we skip it (no bank selection)

        vnp_Params.put("vnp_TxnRef", vnp_TxnRef);
        vnp_Params.put("vnp_OrderInfo", "Thanh toan don hang:" + vnp_TxnRef);
        vnp_Params.put("vnp_OrderType", orderType);

        // Locale — matches official: default "vn"
        vnp_Params.put("vnp_Locale", "vn");

        vnp_Params.put("vnp_ReturnUrl", vnpayProperties.getReturnUrl());
        vnp_Params.put("vnp_IpAddr", vnp_IpAddr);

        // Date generation — uses Asia/Ho_Chi_Minh (Vietnam timezone)
        // Official sample uses Etc/GMT+7 which is actually UTC-7 (a known bug)
        Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
        String vnp_CreateDate = formatter.format(cld.getTime());
        vnp_Params.put("vnp_CreateDate", vnp_CreateDate);

        cld.add(Calendar.MINUTE, 15);
        String vnp_ExpireDate = formatter.format(cld.getTime());
        vnp_Params.put("vnp_ExpireDate", vnp_ExpireDate);

        // --- Build query string and hash data (matches official ajaxServlet.java) ---
        // Sort field names, use iterator-based '&' separator pattern

        List<String> fieldNames = new ArrayList<>(vnp_Params.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();
        Iterator<String> itr = fieldNames.iterator();

        try {
            while (itr.hasNext()) {
                String fieldName = itr.next();
                String fieldValue = vnp_Params.get(fieldName);
                if ((fieldValue != null) && (fieldValue.length() > 0)) {
                    // Build hash data
                    hashData.append(fieldName);
                    hashData.append('=');
                    hashData.append(URLEncoder.encode(fieldValue, StandardCharsets.UTF_8.toString()));
                    // Build query
                    query.append(URLEncoder.encode(fieldName, StandardCharsets.UTF_8.toString()));
                    query.append('=');
                    query.append(URLEncoder.encode(fieldValue, StandardCharsets.UTF_8.toString()));
                    if (itr.hasNext()) {
                        query.append('&');
                        hashData.append('&');
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error encoding VNPAY parameters", e);
            throw new RuntimeException("Could not create payment URL");
        }

        String queryUrl = query.toString();
        String vnp_SecureHash = VnpayConfig.hmacSHA512(vnpayProperties.getHashSecret(), hashData.toString());
        queryUrl += "&vnp_SecureHash=" + vnp_SecureHash;
        String paymentUrl = vnpayProperties.getPayUrl() + "?" + queryUrl;

        log.info("Created VNPAY payment URL for order: {}, vnpTxnRef: {}", orderCode, vnp_TxnRef);
        return VnpayPaymentCreation.builder()
                .paymentUrl(paymentUrl)
                .orderCode(orderCode)
                .build();
    }

    /**
     * Process the VNPAY return callback.
     * <p>
     * Follows the official VNPAY validation flow:
     * <ol>
     *   <li>Extract and remove {@code vnp_SecureHash} and {@code vnp_SecureHashType} from params</li>
     *   <li>Recalculate hash using {@link VnpayConfig#hashAllFields}</li>
     *   <li>Compare calculated hash with received hash</li>
     *   <li>Check response code for success/failure</li>
     *   <li>Update transaction status accordingly</li>
     *   <li>Call {@code subscriptionService.processSuccessfulPayment()} on success</li>
     * </ol>
     * </p>
     *
     * @param params the VNPAY return URL parameters
     */
    @Transactional
    public VnpayReturnResult processReturn(Map<String, String> params) {
        String vnp_SecureHash = params.get("vnp_SecureHash");
        if (vnp_SecureHash == null) {
            throw new PaymentException("Missing secure hash");
        }

        // Remove hash fields before recalculating — matches official flow
        Map<String, String> fields = new HashMap<>(params);
        fields.remove("vnp_SecureHash");
        fields.remove("vnp_SecureHashType");

        // Verify signature using VnpayConfig.hashAllFields — matches official Config.hashAllFields()
        String calculatedHash = VnpayConfig.hashAllFields(fields, vnpayProperties.getHashSecret());
        if (!calculatedHash.equals(vnp_SecureHash)) {
            throw new PaymentException("Invalid checksum");
        }

        String vnpTxnRef = params.get("vnp_TxnRef");
        String responseCode = params.get("vnp_ResponseCode");
        String transactionNo = params.get("vnp_TransactionNo");
        String rawResponse = params.toString();

        // Look up transaction by vnpTxnRef
        PaymentTransaction transaction = paymentTransactionRepository.findByVnpTxnRef(vnpTxnRef)
                .orElseThrow(() -> new PaymentException("Transaction not found for vnp_TxnRef: " + vnpTxnRef));

        if (transaction.getStatus() != PaymentStatus.PENDING) {
            log.warn("Transaction {} is already processed (Status: {})", vnpTxnRef, transaction.getStatus());
            return VnpayReturnResult.builder()
                    .orderCode(transaction.getOrderCode())
                    .status(transaction.getStatus().name())
                    .success(transaction.getStatus() == PaymentStatus.SUCCESS)
                    .message("Payment was already processed")
                    .build();
        }

        transaction.setTransactionNo(transactionNo);
        transaction.setRawResponse(rawResponse);
        transaction.setPaymentTime(LocalDateTime.now());

        if ("00".equals(responseCode)) {
            transaction.setStatus(PaymentStatus.SUCCESS);
            paymentTransactionRepository.save(transaction);
            log.info("Payment SUCCESS for vnpTxnRef: {}, orderCode: {}", vnpTxnRef, transaction.getOrderCode());

            // Grant subscription — preserves existing business logic
            subscriptionService.processSuccessfulPayment(
                    transaction.getUser().getId(),
                    transaction.getPlan().getId(),
                    transaction.getPurchasedDays()
            );

            smtpEmailService.sendPaymentResultEmail(
                    transaction.getUser(),
                    transaction.getPlanName(),
                    transaction.getAmount() != null ? transaction.getAmount().toPlainString() : "",
                    transaction.getPurchasedDays() != null ? transaction.getPurchasedDays() + " days" : "",
                    true
            );

            notificationService.create(
                    transaction.getUser(),
                    NotificationType.PAYMENT_SUCCESS,
                    "Payment successful",
                    "Your payment for " + transaction.getPlanName() + " was successful",
                    "PAYMENT",
                    transaction.getId(),
                    "/app/subscription"
            );

            return VnpayReturnResult.builder()
                    .orderCode(transaction.getOrderCode())
                    .status(transaction.getStatus().name())
                    .success(true)
                    .message("Payment successful")
                    .build();
        } else {
            transaction.setStatus(PaymentStatus.FAILED);
            transaction.setFailureReason("VNPAY Response Code: " + responseCode);
            paymentTransactionRepository.save(transaction);
            log.info("Payment FAILED for vnpTxnRef: {}. Reason: {}", vnpTxnRef, responseCode);
            smtpEmailService.sendPaymentResultEmail(
                    transaction.getUser(),
                    transaction.getPlanName(),
                    transaction.getAmount() != null ? transaction.getAmount().toPlainString() : "",
                    transaction.getPurchasedDays() != null ? transaction.getPurchasedDays() + " days" : "",
                    false
            );

            notificationService.create(
                    transaction.getUser(),
                    NotificationType.PAYMENT_FAILED,
                    "Payment failed",
                    "Your payment for " + transaction.getPlanName() + " failed",
                    "PAYMENT",
                    transaction.getId(),
                    "/app/subscription"
            );

            return VnpayReturnResult.builder()
                    .orderCode(transaction.getOrderCode())
                    .status(transaction.getStatus().name())
                    .success(false)
                    .message(transaction.getFailureReason())
                    .build();
        }
    }

    private int resolvePurchasedDays(SubscriptionPlan plan) {
        Integer durationDays = plan.getDurationDays();

        if (durationDays == null || durationDays <= 0) {
            throw new PaymentException(
                    "Plan duration is not configured for plan: " + plan.getCode()
            );
        }

        return durationDays;
    }
}
