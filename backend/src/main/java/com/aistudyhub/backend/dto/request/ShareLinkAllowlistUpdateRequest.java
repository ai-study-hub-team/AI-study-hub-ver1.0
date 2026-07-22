package com.aistudyhub.backend.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * Request body for adding users to a share link's allowlist.
 * Only valid when the link's accessPolicy = PRIVATE_ALLOWLIST.
 */
@Getter
@Setter
public class ShareLinkAllowlistUpdateRequest {

    /** Registered user email addresses to add to the allowlist. */
    private List<String> userEmailsToAdd;

    /** Registered user email addresses to remove from the allowlist. */
    private List<String> userEmailsToRemove;
}
