package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.service.DocumentFileService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/documents")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class AdminDocumentController {

    private final DocumentFileService documentFileService;

    @GetMapping("/{id}/file")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> viewFile(@PathVariable Long id) {
        return documentFileService.viewFile(id);
    }
}
