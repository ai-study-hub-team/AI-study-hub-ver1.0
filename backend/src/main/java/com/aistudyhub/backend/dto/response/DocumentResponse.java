package com.aistudyhub.backend.dto.response;

import com.aistudyhub.backend.entity.DocumentStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Response body returned for a Document.
 */
@Getter
@Setter
@Builder
public class DocumentResponse {

    private Long id;
    private String title;
    private String description;
    private String tags;
    private DocumentStatus status;

    // Owner info
    private Long userId;

    // Category info (null if no category)
    private Long categoryId;
    private String categoryName;

    // File metadata (null if no file attached)
    private Long cloudFileId;
    private String originalName;
    private String fileUrl;
    private String fileType;
    private Long fileSize;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
