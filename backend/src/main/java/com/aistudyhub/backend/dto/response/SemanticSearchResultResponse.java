package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;

/**
 * One item in a semantic search result.
 * chunkText is fetched from MySQL after Pinecone returns documentId + chunkIndex.
 */
@Getter
@Builder
public class SemanticSearchResultResponse {

    private Integer documentId;
    private String  documentTitle;
    private Integer chunkIndex;
    private Double  score;
    private Double  finalScore;

    // Fetched from MySQL document_chunks
    private String  chunkText;       // null if chunk not found in MySQL

    // Metadata from Pinecone
    private Integer charStart;
    private Integer charEnd;
    private Integer textLength;
    private String  originalFileName;

    // Warning populated when the MySQL chunk cannot be found
    private String  warning;

    // "SEMANTIC" = came from Pinecone, "KEYWORD" = came from MySQL keyword fallback
    private String  source;
}
