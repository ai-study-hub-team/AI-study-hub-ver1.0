package com.aistudyhub.backend.exception;

/**
 * Thrown when an uploaded file exceeds {@code maxFileSizeBytes} configured on the share link
 * or the plan-level per-file size limit.
 *
 * <p>Mapped to HTTP {@code 413 Payload Too Large} by {@link GlobalExceptionHandler}.
 */
public class FileTooLargeException extends RuntimeException {

    public FileTooLargeException(String message) {
        super(message);
    }
}
