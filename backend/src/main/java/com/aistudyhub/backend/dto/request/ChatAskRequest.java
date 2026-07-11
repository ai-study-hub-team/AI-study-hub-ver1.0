package com.aistudyhub.backend.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * Request body sent by the frontend when the user submits a question in a chat session.
 */
@Getter
@Setter
public class ChatAskRequest {

    private String sessionId;
    private List<Long> documentIds;
    private String question;
}
