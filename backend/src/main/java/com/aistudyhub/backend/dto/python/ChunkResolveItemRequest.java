package com.aistudyhub.backend.dto.python;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChunkResolveItemRequest {
    private Long documentId;
    private Integer chunkIndex;
}
