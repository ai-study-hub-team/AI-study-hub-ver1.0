package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.python.*;
import com.aistudyhub.backend.dto.response.ChunkSearchResponse;
import com.aistudyhub.backend.entity.Document;
import com.aistudyhub.backend.entity.DocumentChunk;
import com.aistudyhub.backend.repository.DocumentChunkRepository;
import com.aistudyhub.backend.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Collections;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DocumentChunkService {


    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentRepository documentRepository;

    public List<ChunkSearchResponse> searchInDocument(Long documentId, String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            throw new IllegalArgumentException("Keyword cannot be empty");
        }

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + documentId));

        List<DocumentChunk> chunks = documentChunkRepository.findByDocumentIdAndChunkTextContainingIgnoreCaseOrderByChunkIndexAsc(documentId, keyword);

        return chunks.stream().map(chunk -> toResponse(chunk, document, keyword)).collect(Collectors.toList());
    }

    public Page<ChunkSearchResponse> searchGlobal(String keyword, Pageable pageable) {
        if (keyword == null || keyword.trim().isEmpty()) {
            throw new IllegalArgumentException("Keyword cannot be empty");
        }

        Page<DocumentChunk> chunks = documentChunkRepository.findByChunkTextContainingIgnoreCase(keyword, pageable);

        return chunks.map(chunk -> toResponse(chunk, chunk.getDocument(), keyword));
    }

    private ChunkSearchResponse toResponse(DocumentChunk chunk, Document document, String keyword) {
        String fullText = chunk.getChunkText();
        String previewText = fullText;
        
        if (fullText != null && keyword != null) {
            int idx = fullText.toLowerCase().indexOf(keyword.toLowerCase());
            if (idx != -1) {
                int start = Math.max(0, idx - 50);
                int end = Math.min(fullText.length(), idx + keyword.length() + 50);
                previewText = (start > 0 ? "..." : "") + fullText.substring(start, end) + (end < fullText.length() ? "..." : "");
            } else if (fullText.length() > 200) {
                previewText = fullText.substring(0, 200) + "...";
            }
        }

        return ChunkSearchResponse.builder()
                .documentId(document.getId())
                .documentTitle(document.getTitle())
                .chunkId(chunk.getId())
                .chunkIndex(chunk.getChunkIndex())
                .previewText(previewText)
                .charStart(chunk.getCharStart())
                .charEnd(chunk.getCharEnd())
                .textLength(chunk.getTextLength())
                .build();
    }

    @Transactional(readOnly = true)
    public ChunkResolveBatchResponse resolveChunks(ChunkResolveBatchRequest request) {
        if (request == null || request.getChunks() == null) {
            return ChunkResolveBatchResponse.builder()
                    .chunks(Collections.emptyList())
                    .build();
        }

        List<ChunkResolveItemResponse> resolved = request.getChunks().stream()
                .map(item -> {
                    if (item == null || item.getDocumentId() == null || item.getChunkIndex() == null) {
                        return ChunkResolveItemResponse.builder()
                                .documentId(item != null ? item.getDocumentId() : null)
                                .chunkIndex(item != null ? item.getChunkIndex() : null)
                                .chunkText(null)
                                .found(false)
                                .build();
                    }

                    Optional<DocumentChunk> chunkOpt = documentChunkRepository
                            .findByDocument_IdAndChunkIndex(item.getDocumentId(), item.getChunkIndex());

                    if (chunkOpt.isPresent()) {
                        return ChunkResolveItemResponse.builder()
                                .documentId(item.getDocumentId())
                                .chunkIndex(item.getChunkIndex())
                                .chunkText(chunkOpt.get().getChunkText())
                                .found(true)
                                .build();
                    } else {
                        return ChunkResolveItemResponse.builder()
                                .documentId(item.getDocumentId())
                                .chunkIndex(item.getChunkIndex())
                                .chunkText(null)
                                .found(false)
                                .build();
                    }
                })
                .collect(Collectors.toList());

        return ChunkResolveBatchResponse.builder()
                .chunks(resolved)
                .build();
    }
}

