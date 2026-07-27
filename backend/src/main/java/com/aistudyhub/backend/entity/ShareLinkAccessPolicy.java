package com.aistudyhub.backend.entity;

/**
 * Access policy governing who may upload through a DocumentShareLink.
 *
 * <p>Only PRIVATE_ALLOWLIST and ANY_AUTHENTICATED_USER are fully operational.
 * GROUP and ORGANIZATION are reserved for forward compatibility but are
 * rejected by the service layer with a 422 Unprocessable Entity error
 * until the corresponding domain models exist.
 */
public enum ShareLinkAccessPolicy {

    /**
     * Only explicitly allowlisted users may upload.
     * Requires at least one entry in {@code document_share_link_allowed_users}.
     * This is the default for all newly created links and the secure migration default.
     */
    PRIVATE_ALLOWLIST,

    /**
     * Any authenticated user in the system may upload.
     * No allowlist entries are required or checked.
     */
    ANY_AUTHENTICATED_USER,

    /**
     * Reserved – Group-based access. NOT currently supported.
     * Selecting this policy returns 422 Unprocessable Entity.
     */
    GROUP,

    /**
     * Reserved – Organization-based access. NOT currently supported.
     * Selecting this policy returns 422 Unprocessable Entity.
     */
    ORGANIZATION
}
