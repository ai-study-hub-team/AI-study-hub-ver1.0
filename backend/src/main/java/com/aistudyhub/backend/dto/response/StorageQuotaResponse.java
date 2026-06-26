package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class StorageQuotaResponse {
    private Long storageLimitMb;
    private Long usedStorageMb;
    private Long remainingMb;
}
