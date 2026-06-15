package com.aistudyhub.backend.dto.python;

import lombok.*;

import java.util.List;

/**
 * Request payload sent to the Python AI service.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PythonChatRequest {
    private String sessionId;
    private String question;
    private List<Long> documentIds;
    private List<PythonMessage> history;
}
