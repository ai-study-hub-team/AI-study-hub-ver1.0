package com.aistudyhub.backend.dto.response;

import com.aistudyhub.backend.entity.DocumentShareStatus;
import com.aistudyhub.backend.entity.ShareLinkAccessPolicy;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/** Administrative view of a share link. Never exposes its token or URL. */
@Getter
@Builder
public class AdminDocumentShareLinkResponse {
    private Long id;
    private String title;
    private DocumentShareStatus status;
    private ShareLinkAccessPolicy accessPolicy;
    private Long ownerUserId;
    private String ownerName;
    private String ownerEmail;
    private LocalDateTime expiresAt;
    private Integer maxUploads;
    private int currentUploads;
    private Integer maxUploadsPerUser;
    private Long maxFileSizeBytes;
    private Long maxTotalBytes;
    private long activeStoredBytes;
    private String allowedFileTypes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
