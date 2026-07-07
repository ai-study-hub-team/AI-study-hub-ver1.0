package com.aistudyhub.backend.dto.python;

import lombok.*;

/**
 * Represents a single resolved context chunk sent to Python for Gemini prompt building.
 * Spring Boot performs retrieval; Python only needs the chunk text and source metadata.
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

    // ── Locator metadata ────────────────────────────────────────────────────
    /** "PAGE", "SLIDE", "SECTION", "UNKNOWN", or null when not yet populated. */
    private String  locatorType;
    /** 1-based start page/slide number; null when locatorType is UNKNOWN. */
    private Integer locatorStart;
    /** 1-based end page/slide number; null when locatorType is UNKNOWN. */
    private Integer locatorEnd;
}
