package com.aistudyhub.backend.dto.python;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PythonSummaryResponse {
    private String documentId;
    private String summaryType;
    private String summaryText;
    private PythonTokenUsage usage;
}
