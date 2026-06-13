package com.aistudyhub.backend.dto.python;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChunkResolveItemResponse {
    private Long documentId;
    private Integer chunkIndex;
    private String chunkText;
    private boolean found;
}
