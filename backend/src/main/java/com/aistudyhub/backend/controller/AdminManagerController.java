package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.CreateManagerRequest;
import com.aistudyhub.backend.dto.response.UserResponse;
import com.aistudyhub.backend.service.UserService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/managers")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class AdminManagerController {

    private final UserService userService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> createManager(
            @Valid @RequestBody CreateManagerRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(userService.createManager(request));
    }
}