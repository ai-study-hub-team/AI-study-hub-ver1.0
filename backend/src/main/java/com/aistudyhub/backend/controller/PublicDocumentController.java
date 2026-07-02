package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.response.PublicDocumentResponse;
import com.aistudyhub.backend.service.DocumentPublicLinkService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/documents")
@RequiredArgsConstructor
@Tag(name = "Public Documents")
public class PublicDocumentController {

    private final DocumentPublicLinkService documentPublicLinkService;

    @GetMapping("/{token}")
    public ResponseEntity<PublicDocumentResponse> getPublicDocument(
            @PathVariable String token
    ) {
        return ResponseEntity.ok(documentPublicLinkService.getPublicDocumentByToken(token));
    }
}
