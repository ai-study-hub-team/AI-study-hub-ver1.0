package com.aistudyhub.backend.entity;

/**
 * Lifecycle status of a DocumentShareLink.
 * ACTIVE    = link is open and accepts uploads (subject to expiry/maxUploads).
 * DISABLED  = owner manually disabled the link.
 * EXPIRED   = past expiresAt date (checked at service layer).
 */
public enum DocumentShareStatus {
    ACTIVE,
    DISABLED,
    EXPIRED
}
