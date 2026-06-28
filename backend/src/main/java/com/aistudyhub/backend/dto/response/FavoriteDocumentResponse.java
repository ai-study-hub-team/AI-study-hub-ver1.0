package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class FavoriteDocumentResponse {
    private Long favoriteId;
    private Long documentId;
    private String title;
    private String description;
    private String fileType;
    private String processStatus;
    private String visibility;
    private Long ownerId;
    private String ownerName;
    private LocalDateTime favoritedAt;
}
