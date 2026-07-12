package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class AdminStorageDocumentResponse {
    private Long documentId;
    private String title;
    private String fileName;
    private String originalName;
    private String fileType;
    private Long fileSizeBytes;
    private LocalDateTime uploadedAt;
}
