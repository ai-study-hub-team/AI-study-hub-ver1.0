package com.aistudyhub.backend.dto.request;

import com.aistudyhub.backend.enums.SummaryType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SummaryGenerateRequest {
    private Long userId;
    @NotNull(message = "documentId is required")
    private Long documentId;

    private SummaryType summaryType;
}
