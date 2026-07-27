package com.aistudyhub.backend.service;

import com.aistudyhub.backend.entity.DocumentShareLink;
import com.aistudyhub.backend.entity.ShareLinkAccessPolicy;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.exception.ForbiddenException;
import com.aistudyhub.backend.repository.DocumentShareLinkAllowedUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Evaluates whether a given authenticated user is permitted to upload
 * through a specific share link, according to its {@link ShareLinkAccessPolicy}.
 *
 * <h3>Supported policies</h3>
 * <ul>
 *   <li>{@code PRIVATE_ALLOWLIST} – checks {@code document_share_link_allowed_users}
 *   <li>{@code ANY_AUTHENTICATED_USER} – any non-anonymous authenticated user passes
 * </ul>
 *
 * <h3>Unsupported policies</h3>
 * {@code GROUP} and {@code ORGANIZATION} are rejected with a clear error.
 * This class does NOT silently allow or deny — an unsupported policy always throws.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ShareLinkAccessPolicyService {

    private final DocumentShareLinkAllowedUserRepository allowedUserRepository;

    /**
     * Checks whether {@code uploader} is permitted to upload through {@code link}.
     *
     * @param link     the share link being accessed
     * @param uploader the authenticated user attempting to upload
     * @throws ForbiddenException         if the user fails the policy check
     * @throws UnsupportedOperationException if the policy is not yet implemented (GROUP / ORGANIZATION)
     */
    @Transactional(readOnly = true)
    public void assertCanUpload(DocumentShareLink link, User uploader) {
        ShareLinkAccessPolicy policy = link.getAccessPolicy();
        if (policy == null) {
            // Treat null as the most restrictive default
            policy = ShareLinkAccessPolicy.PRIVATE_ALLOWLIST;
        }

        switch (policy) {
            case ANY_AUTHENTICATED_USER -> {
                // Any authenticated user passes; authentication is already enforced by Spring Security
                log.debug("[AccessPolicy] link={} policy=ANY_AUTHENTICATED_USER userId={} — allowed",
                        link.getId(), uploader.getId());
            }
            case PRIVATE_ALLOWLIST -> {
                boolean allowed = allowedUserRepository.existsByShareLinkIdAndAllowedUserId(
                        link.getId(), uploader.getId());
                if (!allowed) {
                    log.warn("[AccessPolicy] link={} policy=PRIVATE_ALLOWLIST userId={} — denied (not on allowlist)",
                            link.getId(), uploader.getId());
                    throw new ForbiddenException(
                            "You are not on the allowlist for this share link.");
                }
                log.debug("[AccessPolicy] link={} policy=PRIVATE_ALLOWLIST userId={} — allowed",
                        link.getId(), uploader.getId());
            }
            case GROUP, ORGANIZATION -> {
                // Forward-compatible values; not yet implemented.
                // Fail closed — do not silently allow or silently deny.
                log.error("[AccessPolicy] link={} policy={} — NOT SUPPORTED (data integrity error: "
                        + "this policy should not have been persisted)",
                        link.getId(), policy);
                throw new ForbiddenException(
                        "The access policy '" + policy.name() + "' is not currently supported. "
                                + "Please contact the link owner.");
            }
        }
    }
}
