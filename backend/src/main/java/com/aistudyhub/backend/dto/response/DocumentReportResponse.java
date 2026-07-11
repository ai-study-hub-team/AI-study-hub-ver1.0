package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class DocumentReportResponse {
    private Long id;
    private Long documentId;
    private String documentTitle;
    private Long reporterId;
    private String reporterEmail;
    private Long ownerId;
    private String ownerEmail;
    private String reason;
    private String description;
    private String status;
    private String adminNote;
    private Long handledById;
    private String handledByEmail;
    private LocalDateTime handledAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
