package com.aistudyhub.backend.dto.request;

import lombok.Getter;
import lombok.Setter;

/**
 * Request body for moving a document to a folder (or back to root).
 *
 * <ul>
 *   <li>{@code folderId = null} — moves the document back to root.</li>
 *   <li>{@code folderId = 5}   — moves the document into folder 5.</li>
 * </ul>
 * userId is required for ownership validation.
 */
@Getter
@Setter
public class MoveDocumentRequest {

    /** Target folder ID; {@code null} means "move to root". */
    private Long folderId;

    /** The user making the request — used to verify ownership of the document and folder. */
    private Long userId;
}
