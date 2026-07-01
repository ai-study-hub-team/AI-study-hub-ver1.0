package com.aistudyhub.backend.service;

import com.aistudyhub.backend.config.VnpayConfig;
import com.aistudyhub.backend.config.VnpayProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.TimeZone;

/**
 * VNPAY Refund Service — ported from the official {@code vnpayRefund.java}.
 * <p>
 * Allows issuing a refund for a previously completed VNPAY transaction.
 * This service is <strong>prepared for future use</strong> and is not
 * currently wired to any REST controller endpoint.
 * </p>
 * <p>
 * The request-building logic, hash generation, and API call flow
 * match the official {@code vnpayRefund.doPost()} implementation,
 * translated from HttpServlet to Spring Boot {@code @Service} + {@code RestTemplate}.
 * </p>
 * <p>
 * Uses Jackson {@code ObjectNode} instead of Gson {@code JsonObject}
 * because this project does not include the Gson dependency.
 * Jackson is already bundled with Spring Boot.
 * </p>
 *
 * @see VnpayConfig
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VnpayRefundService {

    private final VnpayProperties vnpayProperties;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Issue a refund for a VNPAY transaction.
     * <p>
     * Matches the official {@code vnpayRefund.doPost()} flow:
     * <ol>
     *   <li>Generate a random {@code vnp_RequestId}</li>
     *   <li>Build all refund parameters as a JSON object</li>
     *   <li>Generate the secure hash using pipe-delimited concatenation:
     *       {@code vnp_RequestId|vnp_Version|vnp_Command|vnp_TmnCode|vnp_TransactionType|vnp_TxnRef|vnp_Amount|vnp_TransactionNo|vnp_TransactionDate|vnp_CreateBy|vnp_CreateDate|vnp_IpAddr|vnp_OrderInfo}</li>
     *   <li>POST the JSON to the VNPAY API URL</li>
     * </ol>
     * </p>
     *
     * @param transactionType the refund type (e.g., "02" for full refund, "03" for partial)
     * @param orderId         the VNPAY transaction reference (vnp_TxnRef)
     * @param amount          the refund amount (in VND, before *100)
     * @param transactionNo   the VNPAY transaction number (vnp_TransactionNo), empty string if not available
     * @param transDate       the original transaction date (format: yyyyMMddHHmmss)
     * @param createBy        the user who initiated the refund
     * @param ipAddr          the client IP address
     * @return the VNPAY API JSON response as a string
     */
    public String refundTransaction(String transactionType, String orderId, long amount,
                                     String transactionNo, String transDate,
                                     String createBy, String ipAddr) {
        // Command: refund — matches official
        String vnp_RequestId = VnpayConfig.getRandomNumber(8);
        String vnp_Version = "2.1.0";
        String vnp_Command = "refund";
        String vnp_TmnCode = vnpayProperties.getTmnCode();
        String vnp_TransactionType = transactionType;
        String vnp_TxnRef = orderId;

        // Amount * 100 — matches official
        long vnpAmount = amount * 100;
        String vnp_Amount = String.valueOf(vnpAmount);

        String vnp_OrderInfo = "Hoan tien GD OrderId:" + vnp_TxnRef;
        String vnp_TransactionNo = (transactionNo != null) ? transactionNo : "";
        String vnp_TransactionDate = transDate;
        String vnp_CreateBy = createBy;

        // Create date — uses Vietnam timezone
        Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
        String vnp_CreateDate = formatter.format(cld.getTime());

        String vnp_IpAddr = ipAddr;

        // Build JSON request body — matches official vnpayRefund.java
        // Uses Jackson ObjectNode instead of Gson JsonObject
        ObjectNode vnp_Params = objectMapper.createObjectNode();
        vnp_Params.put("vnp_RequestId", vnp_RequestId);
        vnp_Params.put("vnp_Version", vnp_Version);
        vnp_Params.put("vnp_Command", vnp_Command);
        vnp_Params.put("vnp_TmnCode", vnp_TmnCode);
        vnp_Params.put("vnp_TransactionType", vnp_TransactionType);
        vnp_Params.put("vnp_TxnRef", vnp_TxnRef);
        vnp_Params.put("vnp_Amount", vnp_Amount);
        vnp_Params.put("vnp_OrderInfo", vnp_OrderInfo);

        if (vnp_TransactionNo != null && !vnp_TransactionNo.isEmpty()) {
            vnp_Params.put("vnp_TransactionNo", vnp_TransactionNo);
        }

        vnp_Params.put("vnp_TransactionDate", vnp_TransactionDate);
        vnp_Params.put("vnp_CreateBy", vnp_CreateBy);
        vnp_Params.put("vnp_CreateDate", vnp_CreateDate);
        vnp_Params.put("vnp_IpAddr", vnp_IpAddr);

        // Hash data — pipe-delimited, matches official exactly:
        // vnp_RequestId|vnp_Version|vnp_Command|vnp_TmnCode|vnp_TransactionType|vnp_TxnRef|vnp_Amount|vnp_TransactionNo|vnp_TransactionDate|vnp_CreateBy|vnp_CreateDate|vnp_IpAddr|vnp_OrderInfo
        String hash_Data = String.join("|",
                vnp_RequestId, vnp_Version, vnp_Command, vnp_TmnCode,
                vnp_TransactionType, vnp_TxnRef, vnp_Amount, vnp_TransactionNo,
                vnp_TransactionDate, vnp_CreateBy, vnp_CreateDate, vnp_IpAddr, vnp_OrderInfo);

        String vnp_SecureHash = VnpayConfig.hmacSHA512(vnpayProperties.getHashSecret(), hash_Data);
        vnp_Params.put("vnp_SecureHash", vnp_SecureHash);

        // POST to VNPAY API — uses RestTemplate instead of HttpURLConnection
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<String> entity = new HttpEntity<>(vnp_Params.toString(), headers);

        log.info("Sending VNPAY Refund request to URL: {}", vnpayProperties.getApiUrl());
        log.info("Refund request data: {}", vnp_Params);

        String response = restTemplate.postForObject(vnpayProperties.getApiUrl(), entity, String.class);

        log.info("VNPAY Refund response: {}", response);
        return response;
    }
}
