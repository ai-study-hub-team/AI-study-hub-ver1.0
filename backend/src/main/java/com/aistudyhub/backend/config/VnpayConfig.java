package com.aistudyhub.backend.config;

import jakarta.servlet.http.HttpServletRequest;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * VNPAY utility class — ported from the official VNPAY sample {@code Config.java}.
 * <p>
 * Contains all cryptographic and helper methods required by VNPAY v2.1.0.
 * MD5 and SHA-256 methods from the official sample are intentionally omitted
 * because VNPAY v2.1.0 only requires HMAC-SHA512.
 * </p>
 *
 * @see <a href="https://sandbox.vnpayment.vn">VNPAY Sandbox</a>
 */
public final class VnpayConfig {

    private VnpayConfig() {
        // Utility class — prevent instantiation
    }

    /**
     * Generate HMAC-SHA512 hash.
     * <p>
     * Matches the official {@code Config.hmacSHA512()} algorithm.
     * Difference: uses {@code StandardCharsets.UTF_8} for the key bytes
     * instead of {@code key.getBytes()} (platform default) to ensure
     * consistent behavior across environments.
     * </p>
     *
     * @param key  the HMAC secret key
     * @param data the data to hash
     * @return lowercase hex string of the HMAC-SHA512 hash
     */
    public static String hmacSHA512(final String key, final String data) {
        try {
            if (key == null || data == null) {
                throw new NullPointerException();
            }
            final Mac hmac512 = Mac.getInstance("HmacSHA512");
            byte[] hmacKeyBytes = key.getBytes(StandardCharsets.UTF_8);
            final SecretKeySpec secretKey = new SecretKeySpec(hmacKeyBytes, "HmacSHA512");
            hmac512.init(secretKey);
            byte[] dataBytes = data.getBytes(StandardCharsets.UTF_8);
            byte[] result = hmac512.doFinal(dataBytes);
            StringBuilder sb = new StringBuilder(2 * result.length);
            for (byte b : result) {
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();
        } catch (Exception ex) {
            return "";
        }
    }

    /**
     * Hash all fields in the parameter map using HMAC-SHA512.
     * <p>
     * Matches the official {@code Config.hashAllFields()} algorithm:
     * <ol>
     *   <li>Sort field names alphabetically</li>
     *   <li>Build {@code key=value} pairs joined by {@code &}</li>
     *   <li>Sign with HMAC-SHA512 using the secret key</li>
     * </ol>
     * Uses iterator-based {@code &} separator (same pattern as official sample).
     * </p>
     *
     * @param fields    the parameter map to hash
     * @param secretKey the VNPAY hash secret
     * @return the HMAC-SHA512 hash string
     */
    public static String hashAllFields(Map<String, String> fields, String secretKey) {
        List<String> fieldNames = new ArrayList<>(fields.keySet());
        Collections.sort(fieldNames);
        StringBuilder sb = new StringBuilder();
        Iterator<String> itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = fields.get(fieldName);
            if ((fieldValue != null) && (fieldValue.length() > 0)) {
                sb.append(fieldName);
                sb.append("=");
                try {
                    sb.append(URLEncoder.encode(fieldValue, StandardCharsets.UTF_8.toString()));
                } catch (Exception e) {
                    sb.append(fieldValue);
                }
            }
            if (itr.hasNext()) {
                sb.append("&");
            }
        }
        return hmacSHA512(secretKey, sb.toString());
    }

    /**
     * Get the client IP address from the HTTP request.
     * <p>
     * Matches the official {@code Config.getIpAddress()} logic:
     * checks {@code X-FORWARDED-FOR} header first, falls back to
     * {@code request.getRemoteAddr()}.
     * </p>
     *
     * @param request the HTTP servlet request
     * @return the client IP address string
     */
    public static String getIpAddress(HttpServletRequest request) {
        String ipAddress;
        try {
            ipAddress = request.getHeader("X-FORWARDED-FOR");
            if (ipAddress == null) {
                ipAddress = request.getRemoteAddr();
            }
        } catch (Exception e) {
            ipAddress = "Invalid IP:" + e.getMessage();
        }
        return ipAddress;
    }

    /**
     * Generate a random numeric string of the specified length.
     * <p>
     * Matches the official {@code Config.getRandomNumber()} exactly.
     * Used to generate {@code vnp_TxnRef} and {@code vnp_RequestId}.
     * </p>
     *
     * @param len the desired length of the random string
     * @return a string of random digits
     */
    public static String getRandomNumber(int len) {
        Random rnd = new Random();
        String chars = "0123456789";
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) {
            sb.append(chars.charAt(rnd.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
