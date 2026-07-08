package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.CreatePublicLinkRequest;
import com.aistudyhub.backend.dto.response.PublicLinkResponse;
import com.aistudyhub.backend.service.DocumentPublicLinkService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/documents/{documentId}/shares/public-link")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Document Public Links")
public class DocumentPublicLinkController {

    private final DocumentPublicLinkService documentPublicLinkService;

    @PostMapping
    public ResponseEntity<PublicLinkResponse> createOrUpdatePublicLink(
            @PathVariable Long documentId,
            @Valid @RequestBody CreatePublicLinkRequest request
    ) {
        return ResponseEntity.ok(documentPublicLinkService.createOrUpdatePublicLink(documentId, request));
    }

    @PatchMapping("/disable")
    public ResponseEntity<Void> disablePublicLink(@PathVariable Long documentId) {
        documentPublicLinkService.disablePublicLink(documentId);
        return ResponseEntity.noContent().build();
    }
}
