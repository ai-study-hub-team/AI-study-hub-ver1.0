package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.response.AdminDocumentShareLinkResponse;
import com.aistudyhub.backend.entity.DocumentShareLink;
import com.aistudyhub.backend.entity.DocumentShareStatus;
import com.aistudyhub.backend.exception.BadRequestException;
import com.aistudyhub.backend.exception.ConflictException;
import com.aistudyhub.backend.exception.NotFoundException;
import com.aistudyhub.backend.repository.DocumentShareLinkRepository;
import com.aistudyhub.backend.repository.SharedDocumentSubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AdminDocumentShareLinkService {

    private final DocumentShareLinkRepository shareLinkRepository;
    private final SharedDocumentSubmissionRepository submissionRepository;

    @Transactional(readOnly = true)
    public Page<AdminDocumentShareLinkResponse> getLinks(
            DocumentShareStatus status, String keyword, Pageable pageable) {
        String keywordPattern = keyword == null || keyword.isBlank()
                ? "%"
                : "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
        return shareLinkRepository.searchForAdmin(status, keywordPattern, pageable)
                .map(this::toResponse);
    }

    @Transactional
    public AdminDocumentShareLinkResponse disableLink(Long linkId) {
        DocumentShareLink link = shareLinkRepository.findById(linkId)
                .orElseThrow(() -> new NotFoundException("Share link not found: " + linkId));

        if (link.getStatus() != DocumentShareStatus.DISABLED) {
            link.setStatus(DocumentShareStatus.DISABLED);
            link.setUpdatedAt(LocalDateTime.now());
            link = shareLinkRepository.save(link);
        }
        return toResponse(link);
    }

    @Transactional
    public void deleteLink(Long linkId) {
        DocumentShareLink link = shareLinkRepository.findById(linkId)
                .orElseThrow(() -> new NotFoundException("Share link not found: " + linkId));

        if (link.getStatus() != DocumentShareStatus.EXPIRED
                && link.getStatus() != DocumentShareStatus.DISABLED) {
            throw new BadRequestException("Only expired or disabled share links can be permanently deleted.");
        }
        if (submissionRepository.existsByShareLinkId(linkId)) {
            throw new ConflictException(
                    "This share link has submissions and cannot be permanently deleted.");
        }

        shareLinkRepository.delete(link);
    }

    private AdminDocumentShareLinkResponse toResponse(DocumentShareLink link) {
        return AdminDocumentShareLinkResponse.builder()
                .id(link.getId())
                .title(link.getTitle())
                .status(link.getStatus())
                .accessPolicy(link.getAccessPolicy())
                .ownerUserId(link.getOwner().getId())
                .ownerName(link.getOwner().getFullName())
                .ownerEmail(link.getOwner().getEmail())
                .expiresAt(link.getExpiresAt())
                .maxUploads(link.getMaxUploads())
                .currentUploads(link.getCurrentUploads())
                .maxUploadsPerUser(link.getMaxUploadsPerUser())
                .maxFileSizeBytes(link.getMaxFileSizeBytes())
                .maxTotalBytes(link.getMaxTotalBytes())
                .activeStoredBytes(link.getActiveStoredBytes())
                .allowedFileTypes(link.getAllowedFileTypes())
                .createdAt(link.getCreatedAt())
                .updatedAt(link.getUpdatedAt())
                .build();
    }
}
