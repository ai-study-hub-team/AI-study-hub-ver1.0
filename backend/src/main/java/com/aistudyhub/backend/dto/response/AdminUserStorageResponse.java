package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
public class AdminUserStorageResponse {
    private Long userId;
    private String fullName;
    private String email;
    private Long totalStorageBytes;
    private int documentCount;
    private List<AdminStorageDocumentResponse> documents;
}
