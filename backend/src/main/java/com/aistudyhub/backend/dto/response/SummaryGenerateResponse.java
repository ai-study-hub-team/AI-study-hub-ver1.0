package com.aistudyhub.backend.dto.response;

import com.aistudyhub.backend.enums.SummaryType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SummaryGenerateResponse {
    private Long summaryId;
    private Long documentId;
    private String documentTitle;
    private SummaryType summaryType;
    private String summaryText;
    private Integer totalChunks;
    private Integer totalTextLength;
    private LocalDateTime createdAt;
}
