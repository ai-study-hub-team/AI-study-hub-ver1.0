package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.DocumentShareLinkAllowedUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentShareLinkAllowedUserRepository
        extends JpaRepository<DocumentShareLinkAllowedUser, Long> {

    /** All allowlist entries for a given share link. */
    List<DocumentShareLinkAllowedUser> findByShareLinkId(Long shareLinkId);

    /** Check if a specific user is on the allowlist for a given link. */
    boolean existsByShareLinkIdAndAllowedUserId(Long shareLinkId, Long allowedUserId);

    /** Ownership-scoped lookup of a specific allowlist entry. */
    Optional<DocumentShareLinkAllowedUser> findByShareLinkIdAndAllowedUserId(
            Long shareLinkId, Long allowedUserId);

    /** Remove a specific user from a link's allowlist. */
    void deleteByShareLinkIdAndAllowedUserId(Long shareLinkId, Long allowedUserId);

    /** Remove all allowlist entries for a link (used when a link is deleted). */
    void deleteByShareLinkId(Long shareLinkId);
}
