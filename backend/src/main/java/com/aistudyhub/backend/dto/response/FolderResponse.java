package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Response body returned for a Folder.
 *
 * <p>Does NOT include the parent Folder object — only its ID — to avoid
 * Jackson infinite-recursion and to keep responses lightweight.
 */
@Getter
@Setter
@Builder
public class FolderResponse {

    private Long id;
    private String name;
    private String description;

    /** Owner's user ID. */
    private Long userId;

    /** Parent folder's ID; {@code null} if this is a root-level folder. */
    private Long parentFolderId;

    /** Name of the parent folder (for display convenience); {@code null} if root. */
    private String parentFolderName;

    /** Number of documents directly in this folder. */
    private long documentCount;

    /** Number of direct child sub-folders. */
    private long childFolderCount;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
