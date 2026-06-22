package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.DocumentChunk;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, Long> {

    List<DocumentChunk> findByDocumentIdOrderByChunkIndexAsc(Long documentId);

    List<DocumentChunk> findByDocument_IdOrderByChunkIndexAsc(Long documentId);

    @Modifying
    @Transactional
    @Query("DELETE FROM DocumentChunk c WHERE c.document.id = :documentId")
    void deleteByDocumentId(@Param("documentId") Long documentId);

    long countByDocumentId(Long documentId);

    List<DocumentChunk> findByDocumentIdAndChunkTextContainingIgnoreCaseOrderByChunkIndexAsc(Long documentId, String keyword);

    Page<DocumentChunk> findByChunkTextContainingIgnoreCase(String keyword, Pageable pageable);

    /** Used by semantic search: fetch a single chunk by document + position. */
    Optional<DocumentChunk> findByDocument_IdAndChunkIndex(Long documentId, Integer chunkIndex);

    /** Used by semantic search: fetch chunks in batch by document + positions. */
    List<DocumentChunk> findByDocument_IdAndChunkIndexIn(Long documentId, java.util.Collection<Integer> chunkIndexes);
    /** Used by DOCUMENT_OVERVIEW: fetch first N ordered chunks for context. */
    List<DocumentChunk> findTop30ByDocumentIdOrderByChunkIndexAsc(Long documentId);
}

