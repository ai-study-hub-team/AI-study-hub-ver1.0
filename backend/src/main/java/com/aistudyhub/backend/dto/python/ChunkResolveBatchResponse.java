package com.aistudyhub.backend.dto.python;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChunkResolveBatchResponse {
    private List<ChunkResolveItemResponse> chunks;
}
