package com.aistudyhub.backend.dto.request;

import com.aistudyhub.backend.entity.DocumentReportReason;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReportDocumentRequest {

    @NotNull(message = "reason is required")
    private DocumentReportReason reason;

    @Size(max = 1000, message = "description must not exceed 1000 characters")
    private String description;
}
