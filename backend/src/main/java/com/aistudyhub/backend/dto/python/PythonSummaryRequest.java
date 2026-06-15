package com.aistudyhub.backend.dto.python;

import com.aistudyhub.backend.enums.SummaryType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PythonSummaryRequest {
    private Long documentId;
    private String documentTitle;
    private SummaryType summaryType;
    private Integer totalChunks;
    private Integer totalTextLength;
    private List<PythonSummaryChunk> chunks;
}
