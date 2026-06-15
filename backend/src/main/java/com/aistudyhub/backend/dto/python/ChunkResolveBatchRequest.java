package com.aistudyhub.backend.dto.python;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChunkResolveBatchRequest {
    private List<ChunkResolveItemRequest> chunks;
}
