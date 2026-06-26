package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.VnpayCreateRequest;
import com.aistudyhub.backend.dto.response.PaymentHistoryResponse;
import com.aistudyhub.backend.dto.response.PaymentStatusResponse;
import com.aistudyhub.backend.dto.response.VnpayCreateResponse;
import com.aistudyhub.backend.service.PaymentService;
import com.aistudyhub.backend.service.VnpayService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final VnpayService vnpayService;
    private final PaymentService paymentService;

    @PostMapping("/vnpay/create")
    public ResponseEntity<VnpayCreateResponse> createPayment(
            Authentication authentication,
            @Valid @RequestBody VnpayCreateRequest request) {
        
        Long userId = (Long) authentication.getDetails();
        String paymentUrl = vnpayService.createPaymentUrl(userId, request.getPlanCode());
        
        // Extract order code from URL or return a standard response
        // For simplicity, we just return the URL, the frontend redirects to it.
        // If we want orderCode returned, we'd adjust vnpayService to return a Pair or DTO.
        // Here we'll just return the URL.
        VnpayCreateResponse response = VnpayCreateResponse.builder()
                .paymentUrl(paymentUrl)
                .build();
                
        return ResponseEntity.ok(response);
    }

    @GetMapping("/vnpay-return")
    public ResponseEntity<String> vnpayReturn(@RequestParam Map<String, String> params) {
        vnpayService.processReturn(params);
        // In a real app, you might redirect to a frontend success/failure page here
        return ResponseEntity.ok("Payment processed. Check status via API or frontend.");
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
}
