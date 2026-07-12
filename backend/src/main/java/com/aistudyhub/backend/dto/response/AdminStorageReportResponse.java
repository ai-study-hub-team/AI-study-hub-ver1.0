package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
public class AdminStorageReportResponse {
    private String scope;
    private Long userId;
    private Long totalStorageBytes;
    private int userCount;
    private int documentCount;
    private List<AdminUserStorageResponse> users;
}
