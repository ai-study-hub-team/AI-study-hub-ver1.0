package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response representing a chat message, returned when loading chat history.
 */
@Getter
@Setter
@Builder
public class ChatMessageResponse {

    private String messageId;
    private String role; // "USER" or "ASSISTANT"
    private String content;
    private LocalDateTime createdAt;
    private List<ChatCitationResponse> citations;
}
