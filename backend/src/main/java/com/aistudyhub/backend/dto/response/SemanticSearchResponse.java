package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * Top-level response for GET /api/documents/semantic-search
 */
@Getter
@Builder
public class SemanticSearchResponse {

    private String  query;
    private Long    documentId;   // null means global search (all documents)
    private Integer topK;
    private Integer resultCount;
    private List<SemanticSearchResultResponse> results;
    private String  error;        // populated only when Python service is unreachable
}
