package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class DocumentNoteResponse {
    private Long id;
    private Long userId;
    private Long documentId;
    private String documentTitle;
    private String title;
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
