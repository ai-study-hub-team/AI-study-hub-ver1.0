package com.aistudyhub.backend.exception;

/**
 * Thrown when a create/update share-link request selects a policy that is defined in the
 * enum but not yet implemented (currently {@code GROUP} and {@code ORGANIZATION}).
 *
 * <p>Mapped to HTTP {@code 422 Unprocessable Entity} by {@link GlobalExceptionHandler}.
 */
public class PolicyNotSupportedException extends RuntimeException {

    public PolicyNotSupportedException(String message) {
        super(message);
    }
}
