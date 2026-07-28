package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.request.DocumentShareLinkCreateRequest;
import com.aistudyhub.backend.dto.request.ShareLinkAllowlistUpdateRequest;
import com.aistudyhub.backend.dto.response.DocumentShareLinkResponse;
import com.aistudyhub.backend.dto.response.PublicShareLinkResponse;
import com.aistudyhub.backend.entity.*;
import com.aistudyhub.backend.exception.BadRequestException;
import com.aistudyhub.backend.exception.ForbiddenException;
import com.aistudyhub.backend.exception.NotFoundException;
import com.aistudyhub.backend.exception.PolicyNotSupportedException;
import com.aistudyhub.backend.repository.DocumentShareLinkAllowedUserRepository;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentShareLinkService {

    private final DocumentShareLinkRepository shareLinkRepository;
    private final DocumentShareLinkAllowedUserRepository allowedUserRepository;
    private final UserRepository userRepository;
    private final FolderRepository folderRepository;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;

    @Value("${app.frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    // ─── Policy validation helper ──────────────────────────────────────────────

    /**
     * Validates that the requested access policy is currently supported.
     * GROUP and ORGANIZATION fail with 422 Unprocessable Entity.
     */
    private void rejectUnsupportedPolicy(ShareLinkAccessPolicy policy) {
        if (policy == ShareLinkAccessPolicy.GROUP || policy == ShareLinkAccessPolicy.ORGANIZATION) {
            throw new PolicyNotSupportedException(
                    "The '" + policy.name() + "' access policy is not currently supported. "
                            + "Supported policies: PRIVATE_ALLOWLIST, ANY_AUTHENTICATED_USER.");
        }
    }

    // ─── Create ────────────────────────────────────────────────────────────────

    /**
     * Creates a new share link owned by the currently authenticated user.
     */
    @Transactional
    public DocumentShareLinkResponse createShareLink(DocumentShareLinkCreateRequest request) {
        User owner = currentUserService.getCurrentUser();

        // Resolve and validate access policy
        ShareLinkAccessPolicy policy = request.getAccessPolicy() != null
                ? request.getAccessPolicy()
                : ShareLinkAccessPolicy.PRIVATE_ALLOWLIST;
        rejectUnsupportedPolicy(policy);

        // Validate defaultFolder — must belong to the owner
        Folder defaultFolder = null;
        if (request.getDefaultFolderId() != null) {
            defaultFolder = folderRepository.findByIdAndUserId(
                    request.getDefaultFolderId(), owner.getId())
                    .orElseThrow(() -> new NotFoundException(
                            "Folder not found or does not belong to you: " + request.getDefaultFolderId()));
        }

        String plainToken = generateSecureToken();
        String tokenHash = hashToken(plainToken);

        LocalDateTime now = LocalDateTime.now();
        DocumentShareLink link = DocumentShareLink.builder()
                .owner(owner)
                .tokenHash(tokenHash)
                .plainToken(plainToken)
                .title(request.getTitle())
                .description(request.getDescription())
                .status(DocumentShareStatus.ACTIVE)
                .accessPolicy(policy)
                .expiresAt(request.getExpiresAt())
                .maxUploads(request.getMaxUploads())
                .maxUploadsPerUser(request.getMaxUploadsPerUser())
                .maxFileSizeBytes(request.getMaxFileSizeBytes())
                .maxTotalBytes(request.getMaxTotalBytes())
                .allowedFileTypes(request.getAllowedFileTypes())
                .currentUploads(0)
                .activeStoredBytes(0L)
                .defaultFolder(defaultFolder)
                .createdAt(now)
                .updatedAt(now)
                .build();

        DocumentShareLink saved = shareLinkRepository.save(link);

        // Pre-populate allowlist if provided
        List<User> addedUsers = List.of();
        if (policy == ShareLinkAccessPolicy.PRIVATE_ALLOWLIST
                && request.getAllowedUserEmails() != null
                && !request.getAllowedUserEmails().isEmpty()) {
            addedUsers = addAllowedUsers(saved, request.getAllowedUserEmails(), owner.getId());
        }

        String shareUrl = frontendBaseUrl + "/shared-upload/" + plainToken;
        log.info("[ShareLink] Created link id={} for owner userId={} policy={}",
                saved.getId(), owner.getId(), policy);

        notifyUploadLinkCreated(owner, saved);
        notifyAllowedUsersAdded(saved, owner, addedUsers);

        DocumentShareLinkResponse response = toResponse(saved);
        response.setToken(plainToken);
        response.setShareUrl(shareUrl);
        return response;
    }

    // ─── List ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<DocumentShareLinkResponse> getLinksForCurrentUser() {
        User owner = currentUserService.getCurrentUser();
        return shareLinkRepository.findByOwnerIdOrderByCreatedAtDesc(owner.getId())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─── Disable ───────────────────────────────────────────────────────────────

    @Transactional
    public DocumentShareLinkResponse disableLink(Long linkId) {
        User owner = currentUserService.getCurrentUser();
        DocumentShareLink link = shareLinkRepository.findByIdAndOwnerId(linkId, owner.getId())
                .orElseThrow(() -> new NotFoundException(
                        "Share link not found or does not belong to you: " + linkId));

        if (link.getStatus() == DocumentShareStatus.DISABLED) {
            throw new RuntimeException("Share link is already disabled.");
        }
        link.setStatus(DocumentShareStatus.DISABLED);
        link.setUpdatedAt(LocalDateTime.now());
        DocumentShareLink saved = shareLinkRepository.save(link);
        notifyUploadLinkRevoked(saved);
        log.info("[ShareLink] Disabled link id={} by userId={}", linkId, owner.getId());
        return toResponse(saved);
    }

    // ─── Allowlist management ──────────────────────────────────────────────────

    @Transactional
    public DocumentShareLinkResponse updateAllowlist(Long linkId, ShareLinkAllowlistUpdateRequest request) {
        User owner = currentUserService.getCurrentUser();
        DocumentShareLink link = shareLinkRepository.findByIdAndOwnerId(linkId, owner.getId())
                .orElseThrow(() -> new NotFoundException(
                        "Share link not found or does not belong to you: " + linkId));

        if (link.getAccessPolicy() != ShareLinkAccessPolicy.PRIVATE_ALLOWLIST) {
            throw new RuntimeException(
                    "Allowlist management is only applicable to PRIVATE_ALLOWLIST links.");
        }

        List<User> addedUsers = List.of();
        if (request.getUserEmailsToAdd() != null) {
            addedUsers = addAllowedUsers(link, request.getUserEmailsToAdd(), owner.getId());
        }
        List<User> removedUsers = List.of();
        if (request.getUserEmailsToRemove() != null) {
            List<User> usersToRemove = resolveRegisteredUsers(request.getUserEmailsToRemove());
            removedUsers = usersToRemove.stream()
                    .filter(user -> allowedUserRepository.existsByShareLinkIdAndAllowedUserId(linkId, user.getId()))
                    .collect(Collectors.toList());
            for (User user : usersToRemove) {
                allowedUserRepository.deleteByShareLinkIdAndAllowedUserId(linkId, user.getId());
                log.info("[ShareLink] Removed userId={} from allowlist for linkId={}", user.getId(), linkId);
            }
        }

        notifyAllowedUsersAdded(link, owner, addedUsers);
        notifyAllowedUsersRemoved(link, owner, removedUsers);
        return toResponse(link);
    }

    private List<User> addAllowedUsers(DocumentShareLink link, List<String> emails, Long grantedBy) {
        List<User> addedUsers = new java.util.ArrayList<>();
        for (User user : resolveRegisteredUsers(emails)) {
            if (!allowedUserRepository.existsByShareLinkIdAndAllowedUserId(link.getId(), user.getId())) {
                DocumentShareLinkAllowedUser entry = DocumentShareLinkAllowedUser.builder()
                        .shareLink(link)
                        .allowedUserId(user.getId())
                        .grantedByUserId(grantedBy)
                        .build();
                allowedUserRepository.save(entry);
                log.info("[ShareLink] Added userId={} to allowlist for linkId={}", user.getId(), link.getId());
                addedUsers.add(user);
            }
        }
        return addedUsers;
    }

    private List<User> resolveRegisteredUsers(List<String> emails) {
        Set<String> normalizedEmails = new LinkedHashSet<>();
        for (String email : emails) {
            String normalizedEmail = normalizeEmail(email);
            if (!isValidEmail(normalizedEmail)) {
                throw new BadRequestException("Invalid email address.");
            }
            normalizedEmails.add(normalizedEmail);
        }

        return normalizedEmails.stream()
                .map(email -> userRepository.findByEmailIgnoreCase(email)
                        .orElseThrow(() -> new BadRequestException(
                                "No registered user found for email: " + email)))
                .collect(Collectors.toList());
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private boolean isValidEmail(String email) {
        return email.length() <= 254
                && email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    }

    // ─── Public validate (called by the public GET endpoint) ───────────────────

    @Transactional(readOnly = true)
    public PublicShareLinkResponse validatePublicToken(String plainToken) {
        String tokenHash = hashToken(plainToken);
        DocumentShareLink link = shareLinkRepository.findByTokenHash(tokenHash).orElse(null);

        if (link == null) {
            return PublicShareLinkResponse.builder()
                    .allowUpload(false)
                    .reason("Link not found.")
                    .build();
        }
        return buildPublicResponse(link);
    }

    /**
     * Finds and validates a share link for an authenticated upload operation.
     * Throws if the link is invalid, disabled, expired, or at max uploads.
     * Does NOT check the access policy — that is enforced by {@link ShareLinkAccessPolicyService}.
     */
    @Transactional
    public DocumentShareLink findAndValidateLinkForUpload(String plainToken) {
        String tokenHash = hashToken(plainToken);
        DocumentShareLink link = shareLinkRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new NotFoundException("Share link not found."));

        if (link.getStatus() == DocumentShareStatus.DISABLED) {
            throw new ForbiddenException("This share link has been disabled.");
        }
        if (link.getStatus() == DocumentShareStatus.REVOKED) {
            throw new ForbiddenException("This share link has been revoked.");
        }
        boolean expired = link.getStatus() == DocumentShareStatus.EXPIRED
                || (link.getExpiresAt() != null && link.getExpiresAt().isBefore(LocalDateTime.now()));
        if (expired) {
            if (link.getStatus() != DocumentShareStatus.EXPIRED) {
                link.setStatus(DocumentShareStatus.EXPIRED);
                shareLinkRepository.save(link);
                notifyUploadLinkExpired(link);
            }
            throw new ForbiddenException("This share link has expired.");
        }
        if (link.getMaxUploads() != null && link.getCurrentUploads() >= link.getMaxUploads()) {
            throw new ForbiddenException(
                    "This share link has reached its maximum number of uploads.");
        }
        return link;
    }

    @Transactional
    public void expireLinkAndNotify(DocumentShareLink staleRef) {
        DocumentShareLink link = shareLinkRepository.findById(staleRef.getId()).orElse(null);
        if (link == null || link.getStatus() != DocumentShareStatus.ACTIVE) {
            return;
        }
        if (link.getExpiresAt() == null || link.getExpiresAt().isAfter(LocalDateTime.now())) {
            return;
        }

        link.setStatus(DocumentShareStatus.EXPIRED);
        shareLinkRepository.save(link);
        notifyUploadLinkExpired(link);
    }

    // ─── Mapper ────────────────────────────────────────────────────────────────

    public DocumentShareLinkResponse toResponse(DocumentShareLink link) {
        Long folderId = link.getDefaultFolder() != null ? link.getDefaultFolder().getId() : null;
        String folderName = link.getDefaultFolder() != null ? link.getDefaultFolder().getName() : null;

        List<Long> allowedUserIds = allowedUserRepository.findByShareLinkId(link.getId())
                .stream()
                .map(DocumentShareLinkAllowedUser::getAllowedUserId)
                .collect(Collectors.toList());

        return DocumentShareLinkResponse.builder()
                .id(link.getId())
                .ownerUserId(link.getOwner() != null ? link.getOwner().getId() : null)
                .title(link.getTitle())
                .description(link.getDescription())
                .status(link.getStatus())
                .accessPolicy(link.getAccessPolicy())
                .expiresAt(link.getExpiresAt())
                .maxUploads(link.getMaxUploads())
                .currentUploads(link.getCurrentUploads())
                .maxUploadsPerUser(link.getMaxUploadsPerUser())
                .maxFileSizeBytes(link.getMaxFileSizeBytes())
                .maxTotalBytes(link.getMaxTotalBytes())
                .allowedFileTypes(link.getAllowedFileTypes())
                .allowedUserIds(allowedUserIds)
                .defaultFolderId(folderId)
                .defaultFolderName(folderName)
                .token(link.getPlainToken())
                .shareUrl(link.getPlainToken() == null
                        ? null
                        : frontendBaseUrl + "/shared-upload/" + link.getPlainToken())
                .createdAt(link.getCreatedAt())
                .updatedAt(link.getUpdatedAt())
                .build();
    }

    private PublicShareLinkResponse buildPublicResponse(DocumentShareLink link) {
        boolean expired = link.getExpiresAt() != null
                && link.getExpiresAt().isBefore(LocalDateTime.now());
        boolean maxReached = link.getMaxUploads() != null
                && link.getCurrentUploads() >= link.getMaxUploads();

        boolean allowUpload = link.getStatus() == DocumentShareStatus.ACTIVE && !expired && !maxReached;

        String reason = null;
        if (!allowUpload) {
            if (link.getStatus() == DocumentShareStatus.DISABLED) reason = "This link has been disabled.";
            else if (link.getStatus() == DocumentShareStatus.REVOKED) reason = "This link has been revoked.";
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
        byte[] bytes = new byte[32]; // 256 bits of entropy
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

    private void notifyUploadLinkCreated(User owner, DocumentShareLink link) {
        notificationService.create(
                owner,
                NotificationType.UPLOAD_LINK_CREATED,
                "Upload link created",
                "You created upload link \"" + linkTitle(link) + "\"",
                "UPLOAD_LINK",
                link.getId(),
                "/app/shares"
        );
    }

    private void notifyAllowedUsersAdded(DocumentShareLink link, User owner, List<User> addedUsers) {
        for (User user : addedUsers) {
            notificationService.create(
                    user,
                    NotificationType.UPLOAD_LINK_ACCESS_GRANTED,
                    "Upload link access granted",
                    owner.getFullName() + " granted you access to upload documents through \""
                            + linkTitle(link) + "\"",
                    "UPLOAD_LINK",
                    link.getId(),
                    "/shared-upload/" + link.getPlainToken()
            );
            notificationService.create(
                    owner,
                    NotificationType.UPLOAD_LINK_USER_ADDED,
                    "User added to upload link",
                    "You added " + user.getEmail() + " to upload link \"" + linkTitle(link) + "\"",
                    "UPLOAD_LINK",
                    link.getId(),
                    "/app/shares"
            );
        }
    }

    private void notifyAllowedUsersRemoved(DocumentShareLink link, User owner, List<User> removedUsers) {
        for (User user : removedUsers) {
            notificationService.create(
                    owner,
                    NotificationType.UPLOAD_LINK_USER_REMOVED,
                    "User removed from upload link",
                    "You removed " + user.getEmail() + " from upload link \"" + linkTitle(link) + "\"",
                    "UPLOAD_LINK",
                    link.getId(),
                    "/app/shares"
            );
            notificationService.create(
                    user,
                    NotificationType.UPLOAD_LINK_ACCESS_REMOVED,
                    "Upload link access removed",
                    "You no longer have permission to upload documents through \""
                            + linkTitle(link) + "\"",
                    "UPLOAD_LINK",
                    link.getId(),
                    "/app/upload"
            );
        }
    }

    private void notifyUploadLinkRevoked(DocumentShareLink link) {
        User owner = link.getOwner();
        notificationService.create(
                owner,
                NotificationType.UPLOAD_LINK_REVOKED_OWNER,
                "Upload link disabled",
                "You disabled upload link \"" + linkTitle(link) + "\"",
                "UPLOAD_LINK",
                link.getId(),
                "/app/shares"
        );

        for (User user : resolveAllowedUsers(link)) {
            notificationService.create(
                    user,
                    NotificationType.UPLOAD_LINK_REVOKED_RECEIVER,
                    "Upload link disabled",
                    "Upload link \"" + linkTitle(link) + "\" is no longer available",
                    "UPLOAD_LINK",
                    link.getId(),
                    "/app/upload"
            );
        }
    }

    private void notifyUploadLinkExpired(DocumentShareLink link) {
        User owner = link.getOwner();
        notificationService.create(
                owner,
                NotificationType.UPLOAD_LINK_EXPIRED_OWNER,
                "Upload link expired",
                "Upload link \"" + linkTitle(link) + "\" has expired",
                "UPLOAD_LINK",
                link.getId(),
                "/app/shares"
        );

        for (User user : resolveAllowedUsers(link)) {
            notificationService.create(
                    user,
                    NotificationType.UPLOAD_LINK_EXPIRED_RECEIVER,
                    "Upload link expired",
                    "Upload link \"" + linkTitle(link) + "\" has expired",
                    "UPLOAD_LINK",
                    link.getId(),
                    "/app/upload"
            );
        }
    }

    private List<User> resolveAllowedUsers(DocumentShareLink link) {
        return allowedUserRepository.findByShareLinkId(link.getId())
                .stream()
                .map(DocumentShareLinkAllowedUser::getAllowedUserId)
                .map(userRepository::findById)
                .flatMap(Optional::stream)
                .collect(Collectors.toList());
    }

    private String linkTitle(DocumentShareLink link) {
        return link.getTitle() != null && !link.getTitle().isBlank()
                ? link.getTitle()
                : "Untitled upload link";
    }
}
