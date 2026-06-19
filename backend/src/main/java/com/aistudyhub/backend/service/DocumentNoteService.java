package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.request.DocumentNoteCreateRequest;
import com.aistudyhub.backend.dto.request.DocumentNoteUpdateRequest;
import com.aistudyhub.backend.dto.response.DocumentNoteResponse;
import com.aistudyhub.backend.entity.Document;
import com.aistudyhub.backend.entity.DocumentNote;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.exception.ForbiddenException;
import com.aistudyhub.backend.repository.DocumentNoteRepository;
import com.aistudyhub.backend.repository.DocumentRepository;
import com.aistudyhub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DocumentNoteService {

    private final DocumentNoteRepository documentNoteRepository;
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;

    @Transactional
    public DocumentNoteResponse createNote(DocumentNoteCreateRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found with id: " + request.getUserId()));

        Document document = documentRepository.findById(request.getDocumentId())
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + request.getDocumentId()));

        if (!document.getUser().getId().equals(request.getUserId())) {
            throw new ForbiddenException("Access Denied: You do not have permission to add a note to this document");
        }

        DocumentNote note = DocumentNote.builder()
                .user(user)
                .document(document)
                .title(request.getTitle())
                .content(request.getContent())
                .build();

        note = documentNoteRepository.save(note);
        return mapToResponse(note);
    }

    @Transactional(readOnly = true)
    public List<DocumentNoteResponse> getNotesByDocument(Long documentId, Long userId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + documentId));

        if (!document.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Access Denied: You do not have permission to view notes for this document");
        }

        List<DocumentNote> notes = documentNoteRepository.findByUser_IdAndDocument_IdOrderByUpdatedAtDesc(userId, documentId);
        return notes.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DocumentNoteResponse getNoteById(Long noteId, Long userId) {
        DocumentNote note = documentNoteRepository.findByIdAndUser_Id(noteId, userId)
                .orElseThrow(() -> new RuntimeException("Note not found or access denied"));
        return mapToResponse(note);
    }

    @Transactional
    public DocumentNoteResponse updateNote(Long noteId, DocumentNoteUpdateRequest request) {
        DocumentNote note = documentNoteRepository.findByIdAndUser_Id(noteId, request.getUserId())
                .orElseThrow(() -> new RuntimeException("Note not found or access denied"));

        note.setTitle(request.getTitle());
        note.setContent(request.getContent());

        note = documentNoteRepository.save(note);
        return mapToResponse(note);
    }

    @Transactional
    public void deleteNote(Long noteId, Long userId) {
        DocumentNote note = documentNoteRepository.findByIdAndUser_Id(noteId, userId)
                .orElseThrow(() -> new RuntimeException("Note not found or access denied"));
        
        documentNoteRepository.delete(note);
    }

    private DocumentNoteResponse mapToResponse(DocumentNote note) {
        return DocumentNoteResponse.builder()
                .id(note.getId())
                .userId(note.getUser().getId())
                .documentId(note.getDocument().getId())
                .documentTitle(note.getDocument().getTitle())
                .title(note.getTitle())
                .content(note.getContent())
                .createdAt(note.getCreatedAt())
                .updatedAt(note.getUpdatedAt())
                .build();
    }
}
