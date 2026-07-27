package com.aistudyhub.backend.exception;

/**
 * Thrown when the share-link owner does not have sufficient storage quota to
 * accept the file being uploaded.
 *
 * <p>Mapped to HTTP {@code 507 Insufficient Storage} by {@link GlobalExceptionHandler}.
 *
 * <p>The message exposed to the uploader must NOT contain the owner's actual quota usage.
 * Use a generic message such as:
 * "The link owner does not currently have enough storage capacity to accept this file."
 */
public class StorageCapacityException extends RuntimeException {

    public StorageCapacityException(String message) {
        super(message);
    }
}
