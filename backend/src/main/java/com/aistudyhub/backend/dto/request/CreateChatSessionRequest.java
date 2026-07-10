package com.aistudyhub.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Request body for creating a new ChatSession.
 * Documents, messages and citations are added later when the user sends a question.
 */
@Getter
@Setter
public class CreateChatSessionRequest {
    // Optional: auto-generated as "New Chat" when blank or null
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;
}
