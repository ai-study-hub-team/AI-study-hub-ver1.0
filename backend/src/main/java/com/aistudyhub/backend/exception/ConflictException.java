package com.aistudyhub.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a request conflicts with the current state of a resource.
 * Maps to HTTP 409 Conflict.
 *
 * Example: restoring a document that is not currently in trash,
 * or permanently deleting a document that has not been trashed yet.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
