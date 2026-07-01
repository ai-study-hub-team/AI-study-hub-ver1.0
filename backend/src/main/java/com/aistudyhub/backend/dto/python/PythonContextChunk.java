package com.aistudyhub.backend.dto.python;

import lombok.*;

/**
 * Represents a single resolved context chunk sent to Python for Gemini prompt building.
 * Spring Boot performs retrieval; Python only needs the chunk text.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PythonContextChunk {
    private Long   documentId;
    private String documentTitle;
    private Long   chunkId;
    private int    chunkIndex;
    private String chunkText;
    private Double score;        // finalScore from hybrid search
    private String sourceLabel;  // e.g. "Chunk 3", "Slide 2" — optional, for logging
}
