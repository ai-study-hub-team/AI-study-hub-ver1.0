package com.aistudyhub.backend.dto.python;

import lombok.*;

/**
 * Citation details returned by the Python AI service.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PythonCitation {
    private Long documentId;
    private Integer chunkIndex;
    private Double score;
    private String previewText;
}
