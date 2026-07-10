package com.aistudyhub.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Request body for creating a folder.
 */
@Getter
@Setter
public class FolderCreateRequest {

    @NotBlank(message = "Folder name must not be blank")
    @Size(max = 255, message = "Folder name must not exceed 255 characters")
    private String name;

    private String description;

    /** {@code null} creates a root-level folder; a value nests under that parent. */
    private Long parentFolderId;
}
