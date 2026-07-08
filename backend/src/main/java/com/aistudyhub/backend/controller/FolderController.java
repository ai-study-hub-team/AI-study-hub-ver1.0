package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.FolderCreateRequest;
import com.aistudyhub.backend.dto.request.FolderUpdateRequest;
import com.aistudyhub.backend.dto.response.DocumentResponse;
import com.aistudyhub.backend.dto.response.FolderResponse;
import com.aistudyhub.backend.service.DocumentService;
import com.aistudyhub.backend.service.FolderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST endpoints for Folder management.
 *
 * <pre>
 * POST   /api/folders               — create a folder
 * GET    /api/folders?userId=1      — list all folders for a user
 * GET    /api/folders/{id}?userId=1 — get a single folder
 * PUT    /api/folders/{id}          — update folder name/description/parent
 * DELETE /api/folders/{id}?userId=1 — delete folder (children moved to root)
 * </pre>
 *
 * Document-move endpoint lives in {@link DocumentController}:
 * {@code PATCH /api/documents/{id}/folder}
 */
@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
public class FolderController {

    private final FolderService folderService;
    private final DocumentService documentService;

    // POST /api/folders
    @PostMapping
    public ResponseEntity<FolderResponse> create(
            @Valid @RequestBody FolderCreateRequest request) {
        FolderResponse response = folderService.createFolder(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // GET /api/folders?userId=1
    @GetMapping
    public ResponseEntity<List<FolderResponse>> getAllByUser(
            @RequestParam Long userId) {
        return ResponseEntity.ok(folderService.getFoldersByUser(userId));
    }

    // GET /api/folders/{id}?userId=1
    @GetMapping("/{id}")
    public ResponseEntity<FolderResponse> getById(
            @PathVariable Long id,
            @RequestParam Long userId) {
        return ResponseEntity.ok(folderService.getFolderById(id, userId));
    }

    // PUT /api/folders/{id}
    @PutMapping("/{id}")
    public ResponseEntity<FolderResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody FolderUpdateRequest request) {
        return ResponseEntity.ok(folderService.updateFolder(id, request));
    }

    // DELETE /api/folders/{id}?userId=1
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @RequestParam Long userId) {
        folderService.deleteFolder(id, userId);
        return ResponseEntity.noContent().build(); // 204 No Content
    }

    @GetMapping("/{id}/documents")
    public ResponseEntity<List<DocumentResponse>> getDocumentsInFolder(
            @PathVariable Long id) {
        return ResponseEntity.ok(documentService.getDocumentsInAccessibleFolder(id));
    }
}
