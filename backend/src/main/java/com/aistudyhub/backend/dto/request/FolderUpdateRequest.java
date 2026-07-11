package com.aistudyhub.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Request body for updating a folder's name, description, or parent.
 */
@Getter
@Setter
public class FolderUpdateRequest {

    @NotBlank(message = "Folder name must not be blank")
    @Size(max = 255, message = "Folder name must not exceed 255 characters")
    private String name;

    private String description;

    /**
     * New parent folder ID. {@code null} moves the folder to root.
     * Cannot be the folder's own ID (circular check in service).
     */
    private Long parentFolderId;
}
