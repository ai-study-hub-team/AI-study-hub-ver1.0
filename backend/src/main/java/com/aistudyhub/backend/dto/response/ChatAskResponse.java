package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response returned to the frontend after the AI processes the user's question.
 */
@Getter
@Setter
@Builder
public class ChatAskResponse {

    private String sessionId;
    private String userMessageId;
    private String assistantMessageId;
    private String answer;
    private List<ChatCitationResponse> citations;
    private LocalDateTime createdAt;
}
