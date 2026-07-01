package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.DocumentRequest;
import com.aistudyhub.backend.dto.request.MoveDocumentRequest;
import com.aistudyhub.backend.dto.response.DocumentResponse;
import com.aistudyhub.backend.dto.response.SemanticSearchResponse;
import com.aistudyhub.backend.service.DocumentService;
import com.aistudyhub.backend.service.FileStorageService;
import com.aistudyhub.backend.service.SemanticSearchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.aistudyhub.backend.entity.DocumentProcessStatus;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final FileStorageService fileStorageService;
    private final SemanticSearchService semanticSearchService;

    // POST /api/documents
    @PostMapping
    public ResponseEntity<DocumentResponse> create(@Valid @RequestBody DocumentRequest request) {
        DocumentResponse response = documentService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // GET /api/documents?page=0&size=10
    // Returns paginated list of ACTIVE documents, newest first
    @GetMapping("/search-filter")
    public ResponseEntity<Page<DocumentResponse>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) DocumentProcessStatus processStatus,
            @RequestParam(required = false) String fileType,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) Long folderId,
            @RequestParam(required = false) Boolean rootOnly) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        LocalDateTime fromDateTime = fromDate == null ? null : fromDate.atStartOfDay();
        LocalDateTime toDateTime = toDate == null ? null : toDate.atTime(LocalTime.MAX);

        return ResponseEntity.ok(documentService.searchAndFilter(
                keyword,
                categoryId,
                processStatus,
                fileType,
                tag,
                fromDateTime,
                toDateTime,
                folderId,
                rootOnly,
                pageable
        ));
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

    // POST /api/documents/{id}/reprocess
    @PostMapping("/{id}/reprocess")
    public ResponseEntity<DocumentResponse> reprocess(@PathVariable Long id) {
        try {
            DocumentResponse response = documentService.reprocessDocument(id);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    // GET /api/documents?keyword=java&page=0&size=10
    @GetMapping("/search")
    public ResponseEntity<Page<DocumentResponse>> search(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(documentService.search(keyword, pageable));
    }

    // GET /api/documents/semantic-search?query=...&documentId=9&topK=5
    @GetMapping("/semantic-search")
    public ResponseEntity<SemanticSearchResponse> semanticSearch(
            @RequestParam String query,
            @RequestParam(required = false) Long documentId,
            @RequestParam(defaultValue = "5") int topK) {

        if (query == null || query.isBlank()) {
            return ResponseEntity.badRequest().body(
                    SemanticSearchResponse.builder()
                            .query(query)
                            .documentId(documentId)
                            .topK(0)
                            .resultCount(0)
                            .results(java.util.List.of())
                            .error("Query parameter must not be blank.")
                            .build()
            );
        }

        SemanticSearchResponse response = semanticSearchService.search(query, documentId, topK);
        return ResponseEntity.ok(response);
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
            @RequestParam(value = "categoryId",    required = false) Long categoryId,
            @RequestParam(value = "folderId",      required = false) Long folderId) {

        try {
            DocumentResponse response = documentService.uploadDocument(
                    file, title, description, documentType, visibility, userId, categoryId, folderId
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

    // ─── GET /api/documents/{id}/file ────────────────────────────────────────────
    // Streams the file inline so the browser can display/preview it directly.
    @GetMapping("/{id}/file")
    public ResponseEntity<Resource> viewFile(@PathVariable Long id) {
        // 1. Load document metadata to get fileName and fileType
        var docResponse = documentService.getById(id);
        String fileName = docResponse.getFileName();
        if (fileName == null || fileName.isBlank()) {
            return ResponseEntity.notFound().build();
        }

        // 2. Load the actual file bytes from disk
        Resource resource = fileStorageService.loadFileAsResource(fileName);

        // 3. Determine Content-Type (use stored value, fall back to extension detection)
        String mimeType = docResponse.getFileType() != null
                ? docResponse.getFileType()
                : fileStorageService.getMimeTypeFromFileName(fileName);

        // 4. inline → browser will try to display (PDF renders in-tab, TXT shows as text)
        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(
            ContentDisposition.inline().filename(fileName, StandardCharsets.UTF_8).build()
        );

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType(mimeType))
                .body(resource);
    }

    // ─── GET /api/documents/{id}/download ────────────────────────────────────────
    // Forces a browser download with the original file name.
    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long id) {
        // 1. Load document metadata
        var docResponse = documentService.getById(id);
        String fileName     = docResponse.getFileName();       // stored on disk
        String originalName = docResponse.getOriginalName();   // shown to user
        if (fileName == null || fileName.isBlank()) {
            return ResponseEntity.notFound().build();
        }

        // 2. Load file from disk
        Resource resource = fileStorageService.loadFileAsResource(fileName);

        // 3. Content-Type for download (generic binary is fine, but we keep the real type)
        String mimeType = docResponse.getFileType() != null
                ? docResponse.getFileType()
                : fileStorageService.getMimeTypeFromFileName(fileName);

        // 4. attachment → browser will save the file using originalName
        String downloadName = (originalName != null && !originalName.isBlank()) ? originalName : fileName;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(
            ContentDisposition.attachment().filename(downloadName, StandardCharsets.UTF_8).build()
        );

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType(mimeType))
                .body(resource);
    }


    @GetMapping("/ai-ready")
    public ResponseEntity<Page<DocumentResponse>> getAiReadyDocuments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String fileType,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        LocalDateTime fromDateTime = fromDate == null ? null : fromDate.atStartOfDay();
        LocalDateTime toDateTime = toDate == null ? null : toDate.atTime(LocalTime.MAX);

        return ResponseEntity.ok(documentService.searchAndFilter(
                keyword,
                categoryId,
                DocumentProcessStatus.PROCESSED,
                fileType,
                tag,
                fromDateTime,
                toDateTime,
                pageable
        ));
    }

    // ─── PATCH /api/documents/{id}/folder ────────────────────────────────────────
    // Move a document into a folder, or back to root (folderId = null).
    @PatchMapping("/{id}/folder")
    public ResponseEntity<DocumentResponse> moveToFolder(
            @PathVariable Long id,
            @RequestBody MoveDocumentRequest request) {
        DocumentResponse response = documentService.moveDocumentToFolder(
                id, request.getUserId(), request.getFolderId());
        return ResponseEntity.ok(response);
    }

}
