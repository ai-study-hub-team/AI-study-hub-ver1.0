package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

/**
 * A single citation entry returned to the frontend,
 * showing which document chunk backed the AI answer.
 */
@Getter
@Setter
@Builder
public class ChatCitationResponse {

    private String citationId;
    private Long documentId;
    private String documentTitle;
    private Long chunkId;
    private Integer chunkIndex;
    private Double score;
    private String previewText;
    private String documentName;
    private String type;
    private String label;
}
