package com.aistudyhub.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * Request body for creating a new ChatSession.
 * Documents, messages and citations are added later when the user sends a question.
 */
@Getter
@Setter
public class CreateChatSessionRequest {

    @NotNull(message = "userId is required")
    private Long userId;

    // Optional: auto-generated as "New Chat" when blank or null
    private String title;
}
