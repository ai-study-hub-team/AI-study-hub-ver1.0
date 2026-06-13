package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Response representing a chat session details (e.g. in list view).
 */
@Getter
@Setter
@Builder
public class ChatSessionResponse {

    private String sessionId;
    private Long userId;
    private String title;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
