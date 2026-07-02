package com.aistudyhub.backend.entity;

/**
 * Describes how a Document was created.
 * DIRECT_UPLOAD = owner uploaded directly.
 * SHARED_UPLOAD = created from an approved SharedDocumentSubmission.
 */
public enum DocumentSourceType {
    DIRECT_UPLOAD,
    SHARED_UPLOAD
}
