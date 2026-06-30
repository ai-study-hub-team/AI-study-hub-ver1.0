package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.ShareDocumentRequest;
import com.aistudyhub.backend.dto.response.ShareDocumentResponse;
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
@RequestMapping("/api/documents/{documentId}/shares/users")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Document Shares")
public class DocumentShareController {

    private final DocumentShareService documentShareService;

    @PostMapping
    public ResponseEntity<ShareDocumentResponse> shareToUsers(
            @PathVariable Long documentId,
            @Valid @RequestBody ShareDocumentRequest request
    ) {
        return ResponseEntity.ok(documentShareService.shareDocumentToUsers(documentId, request));
    }

    @GetMapping
    public ResponseEntity<List<SharedUserResponse>> getSharedUsers(
            @PathVariable Long documentId
    ) {
        return ResponseEntity.ok(documentShareService.getSharedUsers(documentId));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> revokeShare(
            @PathVariable Long documentId,
            @PathVariable Long userId
    ) {
        documentShareService.revokeShare(documentId, userId);
        return ResponseEntity.noContent().build();
    }
}
