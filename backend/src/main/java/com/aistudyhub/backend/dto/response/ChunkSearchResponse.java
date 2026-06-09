package com.aistudyhub.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChunkSearchResponse {
    private Long documentId;
    private String documentTitle;
    private Long chunkId;
    private Integer chunkIndex;
    private String previewText;
    private Integer charStart;
    private Integer charEnd;
    private Integer textLength;
}
