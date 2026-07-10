package com.aistudyhub.backend.dto.response;

import com.aistudyhub.backend.entity.DocumentProcessStatus;
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
    private DocumentProcessStatus processStatus;

    // Owner info
    private Long userId;

    // Category info (null if no category)
    private Long categoryId;
    private String categoryName;

    // Folder info (null if document is at root)
    private Long folderId;
    private String folderName;

    // File metadata (null if no file attached)
    private Long cloudFileId;
    private String fileName;          // stored file name on disk
    private String originalName;      // original file name from user
    private String fileUrl;           // path/URL to the file
    private String fileType;          // MIME type
    private Long fileSize;            // size in bytes
    private String storageProvider;   // LOCAL, FIREBASE

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Processing metadata
    private LocalDateTime processedAt;
    private String processErrorMessage;
    private Integer chunkCount;

    // Shared-upload provenance (null for direct uploads)
    private String sourceType;          // "DIRECT_UPLOAD" or "SHARED_UPLOAD"
    private Long sourceSubmissionId;
    private Long contributedByUserId;
    private String contributedByName;
    private String contributedByEmail;

    // Trash metadata
    private boolean isTrashed;
    private LocalDateTime trashedAt;
    private LocalDateTime deleteAfter;
    private Long trashedBy;
}
