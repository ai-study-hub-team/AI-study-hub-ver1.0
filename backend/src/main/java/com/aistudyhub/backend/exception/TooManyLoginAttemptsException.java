package com.aistudyhub.backend.exception;

public class TooManyLoginAttemptsException extends RuntimeException {

    private final long retryAfterSeconds;

    public TooManyLoginAttemptsException(String message, long retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = Math.max(0, retryAfterSeconds);
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
