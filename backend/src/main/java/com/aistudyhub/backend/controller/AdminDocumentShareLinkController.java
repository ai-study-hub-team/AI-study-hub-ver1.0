package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.response.AdminDocumentShareLinkResponse;
import com.aistudyhub.backend.entity.DocumentShareStatus;
import com.aistudyhub.backend.service.AdminDocumentShareLinkService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/document-share-links")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class AdminDocumentShareLinkController {

    private final AdminDocumentShareLinkService adminDocumentShareLinkService;

    @GetMapping
    public ResponseEntity<Page<AdminDocumentShareLinkResponse>> getLinks(
            @RequestParam(required = false) DocumentShareStatus status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(adminDocumentShareLinkService.getLinks(status, keyword, pageable));
    }

    @PatchMapping("/{linkId}/disable")
    public ResponseEntity<AdminDocumentShareLinkResponse> disableLink(@PathVariable Long linkId) {
        return ResponseEntity.ok(adminDocumentShareLinkService.disableLink(linkId));
    }

    @DeleteMapping("/{linkId}")
    public ResponseEntity<Void> deleteLink(@PathVariable Long linkId) {
        adminDocumentShareLinkService.deleteLink(linkId);
        return ResponseEntity.noContent().build();
    }
}
