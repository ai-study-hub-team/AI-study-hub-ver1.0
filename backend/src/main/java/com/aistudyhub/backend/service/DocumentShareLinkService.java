package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.request.DocumentShareLinkCreateRequest;
import com.aistudyhub.backend.dto.response.DocumentShareLinkResponse;
import com.aistudyhub.backend.dto.response.PublicShareLinkResponse;
import com.aistudyhub.backend.entity.*;
import com.aistudyhub.backend.repository.DocumentShareLinkRepository;
import com.aistudyhub.backend.repository.FolderRepository;
import com.aistudyhub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentShareLinkService {

    private final DocumentShareLinkRepository shareLinkRepository;
    private final UserRepository userRepository;
    private final FolderRepository folderRepository;

    @Value("${app.frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    // ─── Create ────────────────────────────────────────────────────────────────

    @Transactional
    public DocumentShareLinkResponse createShareLink(DocumentShareLinkCreateRequest request) {
        User owner = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException(
                        "User not found with id: " + request.getUserId()));

        // Validate defaultFolder if provided — must belong to owner
        Folder defaultFolder = null;
        if (request.getDefaultFolderId() != null) {
            defaultFolder = folderRepository.findByIdAndUserId(
                    request.getDefaultFolderId(), owner.getId())
                    .orElseThrow(() -> new RuntimeException(
                            "Folder not found or does not belong to user: "
                                    + request.getDefaultFolderId()));
        }

        // Generate a cryptographically secure random token
        String plainToken = generateSecureToken();
        String tokenHash = hashToken(plainToken);

        LocalDateTime now = LocalDateTime.now();
        DocumentShareLink link = DocumentShareLink.builder()
                .owner(owner)
                .tokenHash(tokenHash)
                .title(request.getTitle())
                .description(request.getDescription())
                .status(DocumentShareStatus.ACTIVE)
                .expiresAt(request.getExpiresAt())
                .maxUploads(request.getMaxUploads())
                .currentUploads(0)
                .defaultFolder(defaultFolder)
                .createdAt(now)
                .updatedAt(now)
                .build();

        DocumentShareLink saved = shareLinkRepository.save(link);

        // Build the public URL that User A will share with User B
        String shareUrl = frontendBaseUrl + "/shared-upload/" + plainToken;

        log.info("[ShareLink] Created share link id={} for userId={}", saved.getId(), owner.getId());

        // The token is returned ONLY at creation time; subsequent calls return null
        DocumentShareLinkResponse response = toResponse(saved);
        response.setToken(plainToken);
        response.setShareUrl(shareUrl);
        return response;
    }

    // ─── List (for User A) ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<DocumentShareLinkResponse> getLinksForUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new RuntimeException("User not found with id: " + userId);
        }
        return shareLinkRepository.findByOwnerIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)  // token = null in list view
                .collect(Collectors.toList());
    }

    // ─── Disable ───────────────────────────────────────────────────────────────

    @Transactional
    public DocumentShareLinkResponse disableLink(Long linkId, Long userId) {
        DocumentShareLink link = shareLinkRepository.findByIdAndOwnerId(linkId, userId)
                .orElseThrow(() -> new RuntimeException(
                        "Share link not found or does not belong to user: " + linkId));

        if (link.getStatus() == DocumentShareStatus.DISABLED) {
            throw new RuntimeException("Share link is already disabled.");
        }
        link.setStatus(DocumentShareStatus.DISABLED);
        link.setUpdatedAt(LocalDateTime.now());
        DocumentShareLink saved = shareLinkRepository.save(link);
        log.info("[ShareLink] Disabled link id={} by userId={}", linkId, userId);
        return toResponse(saved);
    }

    // ─── Public validate (called by public endpoint) ───────────────────────────

    @Transactional(readOnly = true)
    public PublicShareLinkResponse validatePublicToken(String plainToken) {
        String tokenHash = hashToken(plainToken);
        DocumentShareLink link = shareLinkRepository.findByTokenHash(tokenHash)
                .orElse(null);

        if (link == null) {
            return PublicShareLinkResponse.builder()
                    .allowUpload(false)
                    .reason("Link not found.")
                    .build();
        }
        return buildPublicResponse(link);
    }

    /**
     * Finds and validates a share link for a public upload operation.
     * Throws RuntimeException with a clear message if the link is invalid.
     */
    @Transactional
    public DocumentShareLink findAndValidateLinkForUpload(String plainToken) {
        String tokenHash = hashToken(plainToken);
        DocumentShareLink link = shareLinkRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new RuntimeException("Share link not found."));

        if (link.getStatus() == DocumentShareStatus.DISABLED) {
            throw new RuntimeException("This share link has been disabled.");
        }
        if (link.getStatus() == DocumentShareStatus.EXPIRED
                || (link.getExpiresAt() != null && link.getExpiresAt().isBefore(LocalDateTime.now()))) {
            // Auto-mark as EXPIRED
            link.setStatus(DocumentShareStatus.EXPIRED);
            shareLinkRepository.save(link);
            throw new RuntimeException("This share link has expired.");
        }
        if (link.getMaxUploads() != null && link.getCurrentUploads() >= link.getMaxUploads()) {
            throw new RuntimeException("This share link has reached its maximum number of uploads.");
        }
        return link;
    }

    // ─── Mapper ────────────────────────────────────────────────────────────────

    public DocumentShareLinkResponse toResponse(DocumentShareLink link) {
        Long folderId = link.getDefaultFolder() != null ? link.getDefaultFolder().getId() : null;
        String folderName = link.getDefaultFolder() != null ? link.getDefaultFolder().getName() : null;

        return DocumentShareLinkResponse.builder()
                .id(link.getId())
                .ownerUserId(link.getOwner().getId())
                .title(link.getTitle())
                .description(link.getDescription())
                .status(link.getStatus())
                .expiresAt(link.getExpiresAt())
                .maxUploads(link.getMaxUploads())
                .currentUploads(link.getCurrentUploads())
                .defaultFolderId(folderId)
                .defaultFolderName(folderName)
                // token intentionally left null — only set at creation
                .createdAt(link.getCreatedAt())
                .updatedAt(link.getUpdatedAt())
                .build();
    }

    private PublicShareLinkResponse buildPublicResponse(DocumentShareLink link) {
        boolean expired = link.getExpiresAt() != null
                && link.getExpiresAt().isBefore(LocalDateTime.now());
        boolean maxReached = link.getMaxUploads() != null
                && link.getCurrentUploads() >= link.getMaxUploads();

        boolean allowUpload = link.getStatus() == DocumentShareStatus.ACTIVE
                && !expired && !maxReached;

        String reason = null;
        if (!allowUpload) {
            if (link.getStatus() == DocumentShareStatus.DISABLED) reason = "This link has been disabled.";
            else if (expired) reason = "This link has expired.";
            else if (maxReached) reason = "This link has reached its upload limit.";
        }

        return PublicShareLinkResponse.builder()
                .title(link.getTitle())
                .description(link.getDescription())
                .allowUpload(allowUpload)
                .reason(reason)
                .expiresAt(link.getExpiresAt())
                .build();
    }

    // ─── Token helpers ─────────────────────────────────────────────────────────

    private String generateSecureToken() {
        byte[] bytes = new byte[32]; // 256 bits
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public String hashToken(String plainToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(plainToken.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hashBytes) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
