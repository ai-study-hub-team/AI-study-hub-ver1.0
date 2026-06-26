package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.response.FavoriteDocumentResponse;
import com.aistudyhub.backend.service.FavoriteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Document Favorites")
public class FavoriteController {

    private final FavoriteService favoriteService;

    @Operation(summary = "Add a document to current user's favorites")
    @PostMapping("/{documentId}/favorite")
    public ResponseEntity<FavoriteDocumentResponse> addFavorite(
            @Parameter(description = "Document ID") @PathVariable Long documentId
    ) {
        return ResponseEntity.ok(favoriteService.addFavorite(documentId));
    }

    @Operation(summary = "Remove a document from current user's favorites")
    @DeleteMapping("/{documentId}/favorite")
    public ResponseEntity<Void> removeFavorite(
            @Parameter(description = "Document ID") @PathVariable Long documentId
    ) {
        favoriteService.removeFavorite(documentId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Get current user's favorite documents")
    @GetMapping("/favorites")
    public ResponseEntity<Page<FavoriteDocumentResponse>> getMyFavorites(
            @Parameter(description = "Page index, starts at 0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size")
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(favoriteService.getMyFavorites(pageable));
    }
}
