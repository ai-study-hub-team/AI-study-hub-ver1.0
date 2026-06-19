package com.aistudyhub.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DocumentNoteUpdateRequest {
    @NotNull(message = "userId cannot be null")
    private Long userId;

    @NotBlank(message = "title cannot be blank")
    private String title;

    @NotBlank(message = "content cannot be blank")
    private String content;
}
