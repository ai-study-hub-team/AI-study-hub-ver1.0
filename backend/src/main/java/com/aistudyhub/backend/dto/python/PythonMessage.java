package com.aistudyhub.backend.dto.python;

import lombok.*;

/**
 * Represents a single history message sent to the Python AI service.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PythonMessage {
    private String role;
    private String content;
}
