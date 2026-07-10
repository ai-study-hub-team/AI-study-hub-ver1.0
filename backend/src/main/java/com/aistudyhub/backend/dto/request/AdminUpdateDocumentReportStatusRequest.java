package com.aistudyhub.backend.dto.request;

import com.aistudyhub.backend.entity.DocumentReportStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminUpdateDocumentReportStatusRequest {

    @NotNull(message = "status is required")
    private DocumentReportStatus status;

    @Size(max = 1000, message = "adminNote must not exceed 1000 characters")
    private String adminNote;

    private Boolean hideDocument;
}
