package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.DocumentNoteCreateRequest;
import com.aistudyhub.backend.dto.request.DocumentNoteUpdateRequest;
import com.aistudyhub.backend.dto.response.DocumentNoteResponse;
import com.aistudyhub.backend.service.DocumentNoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/document-notes")
@RequiredArgsConstructor
public class DocumentNoteController {

    private final DocumentNoteService documentNoteService;

    @PostMapping
    public ResponseEntity<DocumentNoteResponse> createNote(@Valid @RequestBody DocumentNoteCreateRequest request) {
        DocumentNoteResponse response = documentNoteService.createNote(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/document/{documentId}")
    public ResponseEntity<List<DocumentNoteResponse>> getNotesByDocument(
            @PathVariable Long documentId,
            @RequestParam Long userId) {
        List<DocumentNoteResponse> responses = documentNoteService.getNotesByDocument(documentId, userId);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{noteId}")
    public ResponseEntity<DocumentNoteResponse> getNoteById(
            @PathVariable Long noteId,
            @RequestParam Long userId) {
        DocumentNoteResponse response = documentNoteService.getNoteById(noteId, userId);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{noteId}")
    public ResponseEntity<DocumentNoteResponse> updateNote(
            @PathVariable Long noteId,
            @Valid @RequestBody DocumentNoteUpdateRequest request) {
        DocumentNoteResponse response = documentNoteService.updateNote(noteId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{noteId}")
    public ResponseEntity<Void> deleteNote(
            @PathVariable Long noteId,
            @RequestParam Long userId) {
        documentNoteService.deleteNote(noteId, userId);
        return ResponseEntity.noContent().build();
    }
}
