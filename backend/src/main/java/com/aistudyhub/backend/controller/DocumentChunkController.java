package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.entity.DocumentChunk;
import com.aistudyhub.backend.repository.DocumentChunkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/documents/{id}/chunks")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DocumentChunkController {

    private final DocumentChunkRepository documentChunkRepository;

    @GetMapping
    public ResponseEntity<List<DocumentChunk>> getChunks(@PathVariable("id") Long documentId) {
        List<DocumentChunk> chunks = documentChunkRepository.findByDocumentIdOrderByChunkIndexAsc(documentId);
        return ResponseEntity.ok(chunks);
    }

    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> getChunkCount(@PathVariable("id") Long documentId) {
        long count = documentChunkRepository.countByDocumentId(documentId);
        Map<String, Long> response = new HashMap<>();
        response.put("count", count);
        return ResponseEntity.ok(response);
    }
}
