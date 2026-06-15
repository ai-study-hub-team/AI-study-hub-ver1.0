package com.aistudyhub.backend.dto.python;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PythonSummaryChunk {
    private Integer chunkIndex;
    private String chunkText;
    private Integer textLength;
}
