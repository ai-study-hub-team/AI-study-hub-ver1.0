package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.DocumentRequest;
import com.aistudyhub.backend.dto.response.DocumentResponse;
import com.aistudyhub.backend.service.DocumentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    // POST /api/documents
    @PostMapping
    public ResponseEntity<DocumentResponse> create(@Valid @RequestBody DocumentRequest request) {
        DocumentResponse response = documentService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // GET /api/documents?page=0&size=10
    // Returns paginated list of ACTIVE documents, newest first
    @GetMapping
    public ResponseEntity<Page<DocumentResponse>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(documentService.getAll(pageable));
    }

    // GET /api/documents/{id}
    @GetMapping("/{id}")
    public ResponseEntity<DocumentResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(documentService.getById(id));
    }

    // PUT /api/documents/{id}
    @PutMapping("/{id}")
    public ResponseEntity<DocumentResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody DocumentRequest request) {
        return ResponseEntity.ok(documentService.update(id, request));
    }

    // DELETE /api/documents/{id}  — soft delete (sets status = DELETED)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        documentService.delete(id);
        return ResponseEntity.noContent().build(); // 204 No Content
    }

    // GET /api/documents/search?keyword=java&page=0&size=10
    @GetMapping("/search")
    public ResponseEntity<Page<DocumentResponse>> search(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(documentService.search(keyword, pageable));
    }

    // ─── POST /api/documents/upload ─────────────────────────────────────────────
    // Accepts multipart/form-data with the actual file + metadata fields
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponse> upload(
            @RequestParam("file")         MultipartFile file,
            @RequestParam("title")        String title,
            @RequestParam(value = "description",   required = false) String description,
            @RequestParam(value = "documentType",  required = false) String documentType,
            @RequestParam(value = "visibility",    required = false) String visibility,
            @RequestParam("userId")       Long userId,
            @RequestParam(value = "categoryId",    required = false) Long categoryId) {

        try {
            DocumentResponse response = documentService.uploadDocument(
                    file, title, description, documentType, visibility, userId, categoryId
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IllegalArgumentException e) {
            // Unsupported file type — return 400 Bad Request
            return ResponseEntity.badRequest().build();

        } catch (IOException e) {
            // Disk / IO error — return 500 Internal Server Error
            return ResponseEntity.internalServerError().build();
        }
    }
}
