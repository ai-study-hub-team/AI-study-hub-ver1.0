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
 * VNPAY Query Service — ported from the official {@code vnpayQuery.java}.
 * <p>
 * Allows querying the status of a VNPAY transaction via the VNPAY API.
 * This service is <strong>prepared for future use</strong> and is not
 * currently wired to any REST controller endpoint.
 * </p>
 * <p>
 * The request-building logic, hash generation, and API call flow
 * match the official {@code vnpayQuery.doPost()} implementation,
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
public class VnpayQueryService {

    private final VnpayProperties vnpayProperties;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Query the status of a VNPAY transaction.
     * <p>
     * Matches the official {@code vnpayQuery.doPost()} flow:
     * <ol>
     *   <li>Generate a random {@code vnp_RequestId}</li>
     *   <li>Build all query parameters as a JSON object</li>
     *   <li>Generate the secure hash using pipe-delimited concatenation:
     *       {@code vnp_RequestId|vnp_Version|vnp_Command|vnp_TmnCode|vnp_TxnRef|vnp_TransactionDate|vnp_CreateDate|vnp_IpAddr|vnp_OrderInfo}</li>
     *   <li>POST the JSON to the VNPAY API URL</li>
     * </ol>
     * </p>
     *
     * @param orderId   the VNPAY transaction reference (vnp_TxnRef)
     * @param transDate the original transaction date (format: yyyyMMddHHmmss)
     * @param ipAddr    the client IP address
     * @return the VNPAY API JSON response as a string
     */
    public String queryTransaction(String orderId, String transDate, String ipAddr) {
        // Command: querydr — matches official
        String vnp_RequestId = VnpayConfig.getRandomNumber(8);
        String vnp_Version = "2.1.0";
        String vnp_Command = "querydr";
        String vnp_TmnCode = vnpayProperties.getTmnCode();
        String vnp_TxnRef = orderId;
        String vnp_OrderInfo = "Kiem tra ket qua GD OrderId:" + vnp_TxnRef;
        String vnp_TransDate = transDate;

        // Create date — uses Vietnam timezone (official uses Etc/GMT+7 which is a known bug)
        Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
        String vnp_CreateDate = formatter.format(cld.getTime());

        String vnp_IpAddr = ipAddr;

        // Build JSON request body — matches official vnpayQuery.java
        // Uses Jackson ObjectNode instead of Gson JsonObject
        ObjectNode vnp_Params = objectMapper.createObjectNode();
        vnp_Params.put("vnp_RequestId", vnp_RequestId);
        vnp_Params.put("vnp_Version", vnp_Version);
        vnp_Params.put("vnp_Command", vnp_Command);
        vnp_Params.put("vnp_TmnCode", vnp_TmnCode);
        vnp_Params.put("vnp_TxnRef", vnp_TxnRef);
        vnp_Params.put("vnp_OrderInfo", vnp_OrderInfo);
        vnp_Params.put("vnp_TransactionDate", vnp_TransDate);
        vnp_Params.put("vnp_CreateDate", vnp_CreateDate);
        vnp_Params.put("vnp_IpAddr", vnp_IpAddr);

        // Hash data — pipe-delimited, matches official exactly:
        // vnp_RequestId|vnp_Version|vnp_Command|vnp_TmnCode|vnp_TxnRef|vnp_TransDate|vnp_CreateDate|vnp_IpAddr|vnp_OrderInfo
        String hash_Data = String.join("|",
                vnp_RequestId, vnp_Version, vnp_Command, vnp_TmnCode,
                vnp_TxnRef, vnp_TransDate, vnp_CreateDate, vnp_IpAddr, vnp_OrderInfo);

        String vnp_SecureHash = VnpayConfig.hmacSHA512(vnpayProperties.getHashSecret(), hash_Data);
        vnp_Params.put("vnp_SecureHash", vnp_SecureHash);

        // POST to VNPAY API — uses RestTemplate instead of HttpURLConnection
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<String> entity = new HttpEntity<>(vnp_Params.toString(), headers);

        log.info("Sending VNPAY Query request to URL: {}", vnpayProperties.getApiUrl());
        log.info("Query request data: {}", vnp_Params);

        String response = restTemplate.postForObject(vnpayProperties.getApiUrl(), entity, String.class);

        log.info("VNPAY Query response: {}", response);
        return response;
    }
}
