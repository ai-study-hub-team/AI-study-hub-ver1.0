package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class PublicDocumentResponse {
    private Long documentId;
    private String title;
    private String description;
    private String fileUrl;
    private Boolean allowDownload;
}
