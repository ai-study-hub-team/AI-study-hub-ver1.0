package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Response body returned after successfully creating a ChatSession.
 */
@Getter
@Setter
@Builder
public class CreateChatSessionResponse {

    private String sessionId;
    private Long userId;
    private String title;
    private LocalDateTime createdAt;
}
