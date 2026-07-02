package com.aistudyhub.backend.service;

import com.aistudyhub.backend.config.ResendProperties;
import com.aistudyhub.backend.dto.request.CreatePublicLinkRequest;
import com.aistudyhub.backend.dto.response.PublicDocumentResponse;
import com.aistudyhub.backend.dto.response.PublicLinkResponse;
import com.aistudyhub.backend.entity.CloudFile;
import com.aistudyhub.backend.entity.Document;
import com.aistudyhub.backend.entity.DocumentPublicLink;
import com.aistudyhub.backend.entity.DocumentSharePermission;
import com.aistudyhub.backend.entity.DocumentStatus;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.exception.BadRequestException;
import com.aistudyhub.backend.exception.ForbiddenException;
import com.aistudyhub.backend.exception.NotFoundException;
import com.aistudyhub.backend.repository.DocumentPublicLinkRepository;
import com.aistudyhub.backend.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class DocumentPublicLinkService {

    private static final int TOKEN_BYTE_LENGTH = 32;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String PUBLIC_DOCUMENT_NOT_FOUND = "Public document not found";

    private final DocumentRepository documentRepository;
    private final DocumentPublicLinkRepository documentPublicLinkRepository;
    private final CurrentUserService currentUserService;
    private final ResendProperties resendProperties;

    @Transactional
    public PublicLinkResponse createOrUpdatePublicLink(
            Long documentId,
            CreatePublicLinkRequest request
    ) {
        User currentUser = currentUserService.getCurrentUser();
        Document document = getActiveDocument(documentId);
        ensureOwner(document, currentUser);

        LocalDateTime expiresAt = request != null ? request.getExpiresAt() : null;
        validateExpiresAt(expiresAt);

        boolean allowDownload = request != null
                && Boolean.TRUE.equals(request.getAllowDownload());

        DocumentSharePermission permission = allowDownload
                ? DocumentSharePermission.DOWNLOAD
                : DocumentSharePermission.VIEW;

        DocumentPublicLink publicLink = documentPublicLinkRepository
                .findByDocumentId(document.getId())
                .orElse(null);

        if (publicLink == null) {
            publicLink = DocumentPublicLink.builder()
                    .document(document)
                    .createdBy(currentUser)
                    .token(generateUniqueToken())
                    .permission(permission)
                    .allowDownload(allowDownload)
                    .isActive(true)
                    .viewCount(0L)
                    .expiresAt(expiresAt)
                    .build();
        } else {
            publicLink.setPermission(permission);
            publicLink.setAllowDownload(allowDownload);
            publicLink.setIsActive(true);
            publicLink.setExpiresAt(expiresAt);
        }

        DocumentPublicLink saved = documentPublicLinkRepository.save(publicLink);
        return toPublicLinkResponse(saved);
    }

    @Transactional
    public void disablePublicLink(Long documentId) {
        User currentUser = currentUserService.getCurrentUser();
        Document document = getActiveDocument(documentId);
        ensureOwner(document, currentUser);

        DocumentPublicLink publicLink = documentPublicLinkRepository
                .findByDocumentId(document.getId())
                .orElseThrow(() -> new RuntimeException("Public link not found"));

        publicLink.setIsActive(false);
        documentPublicLinkRepository.save(publicLink);
    }

    @Transactional
    public PublicDocumentResponse getPublicDocumentByToken(String token) {
        if (token == null || token.isBlank()) {
            throw new NotFoundException(PUBLIC_DOCUMENT_NOT_FOUND);
        }

        DocumentPublicLink publicLink = documentPublicLinkRepository
                .findByToken(token.trim())
                .orElseThrow(() -> new NotFoundException(PUBLIC_DOCUMENT_NOT_FOUND));

        if (!Boolean.TRUE.equals(publicLink.getIsActive())) {
            throw new NotFoundException(PUBLIC_DOCUMENT_NOT_FOUND);
        }

        if (isExpired(publicLink.getExpiresAt())) {
            throw new NotFoundException(PUBLIC_DOCUMENT_NOT_FOUND);
        }

        Document document = publicLink.getDocument();

        if (document == null || document.getStatus() != DocumentStatus.ACTIVE) {
            throw new NotFoundException(PUBLIC_DOCUMENT_NOT_FOUND);
        }

        Long currentViewCount = publicLink.getViewCount() != null ? publicLink.getViewCount() : 0L;
        publicLink.setViewCount(currentViewCount + 1);
        documentPublicLinkRepository.save(publicLink);

        CloudFile cloudFile = document.getCloudFile();

        return PublicDocumentResponse.builder()
                .documentId(document.getId())
                .title(document.getTitle())
                .description(document.getDescription())
                .fileUrl(cloudFile != null ? cloudFile.getFileUrl() : null)
                .allowDownload(Boolean.TRUE.equals(publicLink.getAllowDownload()))
                .build();
    }


    private Document getActiveDocument(Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + documentId));

        if (document.getStatus() != DocumentStatus.ACTIVE) {
            throw new RuntimeException("Document not found with id: " + documentId);
        }

        return document;
    }

    private void ensureOwner(Document document, User currentUser) {
        if (document.getUser() == null
                || !document.getUser().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("Only document owner can manage public link");
        }
    }

    private void validateExpiresAt(LocalDateTime expiresAt) {
        if (expiresAt != null && !expiresAt.isAfter(LocalDateTime.now())) {
            throw new BadRequestException("expiresAt must be in the future");
        }
    }

    private boolean isExpired(LocalDateTime expiresAt) {
        return expiresAt != null && !expiresAt.isAfter(LocalDateTime.now());
    }

    private String generateUniqueToken() {
        String token;

        do {
            token = generateToken();
        } while (documentPublicLinkRepository.existsByToken(token));

        return token;
    }

    private String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTE_LENGTH];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(bytes);
    }

    private PublicLinkResponse toPublicLinkResponse(DocumentPublicLink publicLink) {
        return PublicLinkResponse.builder()
                .publicUrl(buildPublicUrl(publicLink.getToken()))
                .token(publicLink.getToken())
                .allowDownload(Boolean.TRUE.equals(publicLink.getAllowDownload()))
                .isActive(Boolean.TRUE.equals(publicLink.getIsActive()))
                .expiresAt(publicLink.getExpiresAt())
                .build();
    }

    private String buildPublicUrl(String token) {
        String frontendUrl = resendProperties.getFrontendUrl();

        if (frontendUrl == null || frontendUrl.isBlank()) {
            frontendUrl = "http://localhost:5173";
        }

        return trimTrailingSlash(frontendUrl) + "/public/documents/" + token;
    }

    private String trimTrailingSlash(String value) {
        while (value.endsWith("/")) {
            value = value.substring(0, value.length() - 1);
        }

        return value;
    }
}

