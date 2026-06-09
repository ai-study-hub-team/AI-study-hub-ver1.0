package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.DocumentChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, Long> {
    List<DocumentChunk> findByDocumentIdOrderByChunkIndexAsc(Long documentId);
    void deleteByDocumentId(Long documentId);
    long countByDocumentId(Long documentId);

    List<DocumentChunk> findByDocumentIdAndChunkTextContainingIgnoreCaseOrderByChunkIndexAsc(Long documentId, String keyword);
    org.springframework.data.domain.Page<DocumentChunk> findByChunkTextContainingIgnoreCase(String keyword, org.springframework.data.domain.Pageable pageable);
}
