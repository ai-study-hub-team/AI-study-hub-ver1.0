package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.ShareRequest;
import com.aistudyhub.backend.dto.response.ShareResultResponse;
import com.aistudyhub.backend.dto.response.SharedUserResponse;
import com.aistudyhub.backend.service.DocumentShareService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/documents/{documentId}/shares")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Document Shares")
public class DocumentShareController {

    private final DocumentShareService documentShareService;

    @PostMapping
    public ResponseEntity<ShareResultResponse> shareToUsers(
            @PathVariable Long documentId,
            @Valid @RequestBody ShareRequest request
    ) {
        return ResponseEntity.ok(documentShareService.shareDocumentToUsers(documentId, request));
    }

    @GetMapping
    public ResponseEntity<List<SharedUserResponse>> getSharedUsers(
            @PathVariable Long documentId
    ) {
        return ResponseEntity.ok(documentShareService.getSharedUsers(documentId));
    }

    @DeleteMapping("/{targetUserId}")
    public ResponseEntity<Void> revokeShare(
            @PathVariable Long documentId,
            @PathVariable Long targetUserId
    ) {
        documentShareService.revokeShare(documentId, targetUserId);
        return ResponseEntity.noContent().build();
    }
}
