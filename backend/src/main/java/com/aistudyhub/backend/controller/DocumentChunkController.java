package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.python.*;
import com.aistudyhub.backend.dto.response.ChunkSearchResponse;
import com.aistudyhub.backend.entity.DocumentChunk;
import com.aistudyhub.backend.repository.DocumentChunkRepository;
import com.aistudyhub.backend.service.DocumentChunkService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DocumentChunkController {

    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentChunkService documentChunkService;

    @GetMapping("/documents/{id}/chunks")
    public ResponseEntity<List<ChunkSearchResponse>> getChunks(@PathVariable("id") Long documentId) {
        List<ChunkSearchResponse> chunks = documentChunkService.searchInDocument(documentId, "");
        return ResponseEntity.ok(chunks);
    }

    @GetMapping("/documents/{id}/chunks/count")
    public ResponseEntity<Map<String, Long>> getChunkCount(@PathVariable("id") Long documentId) {
        long count = documentChunkRepository.countByDocumentId(documentId);
        Map<String, Long> response = new HashMap<>();
        response.put("count", count);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/documents/{id}/chunks/search")
    public ResponseEntity<?> searchInDocument(
            @PathVariable("id") Long documentId,
            @RequestParam("keyword") String keyword) {
        try {
            List<ChunkSearchResponse> results = documentChunkService.searchInDocument(documentId, keyword);
            return ResponseEntity.ok(results);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(404).body(error);
        }
    }

    @GetMapping("/chunks/search")
    public ResponseEntity<?> searchGlobal(
            @RequestParam("keyword") String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<ChunkSearchResponse> results = documentChunkService.searchGlobal(keyword, pageable);
            return ResponseEntity.ok(results);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/internal/chunks/resolve")
    public ResponseEntity<ChunkResolveBatchResponse> resolveChunks(
            @RequestBody ChunkResolveBatchRequest request) {
        ChunkResolveBatchResponse response = documentChunkService.resolveChunks(request);
        return ResponseEntity.ok(response);
    }
}
