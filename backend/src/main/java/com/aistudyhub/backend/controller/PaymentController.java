package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.VnpayCreateRequest;
import com.aistudyhub.backend.dto.response.PaymentHistoryResponse;
import com.aistudyhub.backend.dto.response.PaymentStatusResponse;
import com.aistudyhub.backend.dto.response.VnpayCreateResponse;
import com.aistudyhub.backend.dto.response.VnpayPaymentCreation;
import com.aistudyhub.backend.dto.response.VnpayReturnResult;
import com.aistudyhub.backend.exception.PaymentException;
import com.aistudyhub.backend.service.PaymentService;
import com.aistudyhub.backend.service.VnpayService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class PaymentController {

    private final VnpayService vnpayService;
    private final PaymentService paymentService;

    @Value("${app.frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    @PostMapping("/vnpay/create")
    public ResponseEntity<VnpayCreateResponse> createPayment(
            Authentication authentication,
            @Valid @RequestBody VnpayCreateRequest request,
            HttpServletRequest httpRequest) {
        
        Long userId = (Long) authentication.getDetails();
        VnpayPaymentCreation payment = vnpayService.createPayment(userId, request.getPlanCode(), httpRequest);
        
        VnpayCreateResponse response = VnpayCreateResponse.builder()
                .paymentUrl(payment.getPaymentUrl())
                .orderCode(payment.getOrderCode())
                .build();
                
        return ResponseEntity.ok(response);
    }

    @GetMapping("/vnpay-return")
    public ResponseEntity<Void> vnpayReturn(@RequestParam Map<String, String> params) {
        try {
            VnpayReturnResult result = vnpayService.processReturn(params);
            URI redirectUri = buildFrontendRedirect(
                    result.isSuccess() ? "success" : "failed",
                    result.getOrderCode(),
                    result.getMessage()
            );

            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(redirectUri)
                    .build();
        } catch (PaymentException ex) {
            URI redirectUri = buildFrontendRedirect(
                    "failed",
                    null,
                    ex.getMessage()
            );

            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(redirectUri)
                    .build();
        } catch (RuntimeException ex) {
            URI redirectUri = buildFrontendRedirect(
                    "failed",
                    null,
                    "Payment processing failed"
            );

            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(redirectUri)
                    .build();
        }
    }

    @GetMapping("/history")
    public ResponseEntity<List<PaymentHistoryResponse>> getPaymentHistory(
            Authentication authentication) {
        Long userId = (Long) authentication.getDetails();
        return ResponseEntity.ok(paymentService.getPaymentHistory(userId));
    }

    @GetMapping("/{orderCode}")
    public ResponseEntity<PaymentStatusResponse> getPaymentStatus(
            Authentication authentication,
            @PathVariable String orderCode) {
        Long userId = (Long) authentication.getDetails();
        return ResponseEntity.ok(paymentService.getPaymentStatus(userId, orderCode));
    }

    private URI buildFrontendRedirect(String paymentStatus, String orderCode, String message) {
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(frontendBaseUrl)
                .path("/app/subscription")
                .queryParam("payment", paymentStatus);

        if (orderCode != null && !orderCode.isBlank()) {
            builder.queryParam("orderCode", orderCode);
        }

        if (message != null && !message.isBlank()) {
            builder.queryParam("message", message);
        }

        return builder.build()
                .encode()
                .toUri();
    }
}
