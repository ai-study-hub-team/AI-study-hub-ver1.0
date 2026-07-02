package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.response.SharedItemResponse;
import com.aistudyhub.backend.service.SharedWithMeService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/shared-with-me")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Shared With Me")
public class SharedWithMeController {

    private final SharedWithMeService sharedWithMeService;

    @GetMapping
    public ResponseEntity<Page<SharedItemResponse>> getSharedItems(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "ALL") String type
    ) {
        return ResponseEntity.ok(sharedWithMeService.getSharedWithMe(type, page, size));
    }
}
