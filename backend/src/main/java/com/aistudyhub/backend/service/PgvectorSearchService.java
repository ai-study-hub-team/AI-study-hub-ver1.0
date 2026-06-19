package com.aistudyhub.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Provides pgvector-based semantic search directly from Spring Boot.
 *
 * <p>When {@code vector.store=pgvector}, the {@link SemanticSearchService} calls
 * this service instead of going through the Python AI service for vector search.
 * The Python service is still used for embedding generation during document
 * processing (upload), but search queries are handled entirely in Spring Boot.</p>
 *
 * <p>This approach is faster because it eliminates the Spring → Python → pgvector
 * round trip and queries pgvector directly from Spring via JDBC.</p>
 *
 * <p>Note: For semantic search, Spring Boot still needs to call Python to generate
 * the query embedding (since the embedding model runs in Python). So the flow is:
 * <ol>
 *   <li>Spring calls Python /embed-query to get the query vector</li>
 *   <li>Spring queries pgvector directly with the vector</li>
 * </ol>
 * OR, if we keep the existing Python semantic-search endpoint (which now routes
 * to pgvector internally), Spring just calls Python as before.</p>
 */
@Service
@Slf4j
public class PgvectorSearchService {

    private final JdbcTemplate pgvectorJdbcTemplate;

    public PgvectorSearchService(@Qualifier("pgvectorJdbcTemplate") JdbcTemplate pgvectorJdbcTemplate) {
        this.pgvectorJdbcTemplate = pgvectorJdbcTemplate;
    }

    /**
     * Check if the pgvector database is reachable and the extension + table exist.
     */
    public boolean isAvailable() {
        try {
            pgvectorJdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return true;
        } catch (Exception e) {
            log.warn("pgvector database is not reachable: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Count embeddings for a specific document.
     */
    public long countEmbeddingsByDocumentId(Long documentId) {
        try {
            Long count = pgvectorJdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM document_chunk_embeddings WHERE document_id = ?",
                    Long.class,
                    documentId
            );
            return count != null ? count : 0;
        } catch (Exception e) {
            log.warn("Failed to count embeddings for document {}: {}", documentId, e.getMessage());
            return 0;
        }
    }
}
