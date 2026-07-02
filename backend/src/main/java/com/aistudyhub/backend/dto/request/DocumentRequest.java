package com.aistudyhub.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Request body for creating or updating a Document.
 * Real file upload is NOT implemented yet — only metadata.
 */
@Getter
@Setter
public class DocumentRequest {
    private Long userId;

    @NotBlank(message = "Title must not be blank")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;

    // Comma-separated tags, e.g. "java,spring,backend"
    private String tags;

    // Optional: link to a category
    private Long categoryId;

    // --- Placeholder file metadata (no real upload yet) ---
    private String originalName;   // e.g. "lecture1.pdf"
    private String fileUrl;        // e.g. "https://storage.example.com/file.pdf"
    private String fileType;       // e.g. "application/pdf"
    private Long fileSize;         // in bytes
}
