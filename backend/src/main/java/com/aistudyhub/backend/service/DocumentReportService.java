package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.request.AdminUpdateDocumentReportStatusRequest;
import com.aistudyhub.backend.dto.request.ReportDocumentRequest;
import com.aistudyhub.backend.dto.response.DocumentReportResponse;
import com.aistudyhub.backend.entity.*;
import com.aistudyhub.backend.enums.UserRole;
import com.aistudyhub.backend.enums.UserStatus;
import com.aistudyhub.backend.exception.BadRequestException;
import com.aistudyhub.backend.exception.ForbiddenException;
import com.aistudyhub.backend.exception.NotFoundException;
import com.aistudyhub.backend.repository.DocumentReportHistoryRepository;
import com.aistudyhub.backend.repository.DocumentReportRepository;
import com.aistudyhub.backend.repository.DocumentRepository;
import com.aistudyhub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DocumentReportService {

    private final DocumentRepository documentRepository;
    private final DocumentReportRepository reportRepository;
    private final DocumentReportHistoryRepository historyRepository;
    private final CurrentUserService currentUserService;
    private final DocumentAccessService documentAccessService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final RolePolicyService rolePolicyService;

    /**
     * Method user report document
     * Lay thong tin user tu jwt sau do tim doc theo doc id neu ko co thi bao loi
     * Kiem tra status ko active thi bao loi
     * Kiem tra owner va ko cho ower tu report chinh minh
     * Chi user co quyen xem document ms dc report neu private ma kg share cho minh bao loi
     * Neu chon ly do la orther thi phai ghi ro li do la gi
     * Kiem tra trung lap neu co roi thi khong tao them duoc
     * Tao report ms status PENDING sau do gui thong bao cho cac ad or manager co trang thai active
     */
    @Transactional
    public DocumentReportResponse reportDocument(Long documentId, ReportDocumentRequest request) {
        User reporter = currentUserService.getCurrentUser();
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new NotFoundException("Document not found"));

        if (document.getStatus() != DocumentStatus.ACTIVE) {
            throw new NotFoundException("Document not found");
        }

        User owner = document.getUser();
        if (owner == null) {
            throw new BadRequestException("Document owner is missing");
        }

        if (owner.getId().equals(reporter.getId())) {
            throw new BadRequestException("You cannot report your own document");
        }

        if (!documentAccessService.canViewDocument(reporter, document)) {
            throw new ForbiddenException("You do not have permission to report this document");
        }

        if (request.getReason() == DocumentReportReason.OTHER
                && (request.getDescription() == null || request.getDescription().isBlank())) {
            throw new BadRequestException("description is required when reason is OTHER");
        }

        boolean duplicated = reportRepository.existsByDocumentIdAndReporterIdAndStatusIn(
                document.getId(),
                reporter.getId(),
                List.of(DocumentReportStatus.PENDING, DocumentReportStatus.REVIEWING)
        );

        if (duplicated) {
            throw new BadRequestException("You already have a pending report for this document");
        }

        DocumentReport report = DocumentReport.builder()
                .document(document)
                .reporter(reporter)
                .owner(owner)
                .reason(request.getReason())
                .description(trimToNull(request.getDescription()))
                .status(DocumentReportStatus.PENDING)
                .build();

        DocumentReport savedReport = reportRepository.save(report);

        userRepository.findByRoleInAndStatus(
                List.of(UserRole.ADMIN, UserRole.MANAGER),
                UserStatus.ACTIVE
        ).forEach(handler -> notificationService.create(
                handler,
                NotificationType.DOCUMENT_REPORTED,
                "New document report",
                reporter.getEmail() + " reported document: " + document.getTitle(),
                "DOCUMENT_REPORT",
                savedReport.getId(),
                "/admin/document-reports/" + savedReport.getId()
        ));

        return toResponse(savedReport);
    }

    /**
     *
     */
    @Transactional(readOnly = true)
    public Page<DocumentReportResponse> getReports(
            DocumentReportStatus status,
            DocumentReportReason reason,
            Pageable pageable
    ) {
        return reportRepository.searchAdmin(status, reason, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public DocumentReportResponse getReport(Long reportId) {
        return toResponse(findReport(reportId));
    }

    @Transactional
    public DocumentReportResponse updateStatus(
            Long reportId,
            AdminUpdateDocumentReportStatusRequest request
    ) {
        User handler = currentUserService.getCurrentUser();
        if (!rolePolicyService.isManagementAccount(handler)) {
            throw new ForbiddenException("Only admin or manager can handle reports");
        }

        DocumentReport report = findReport(reportId);
        DocumentReportStatus oldStatus = report.getStatus();

        report.setStatus(request.getStatus());
        report.setAdminNote(trimToNull(request.getAdminNote()));
        report.setHandledBy(handler);
        report.setHandledAt(LocalDateTime.now());

        if (Boolean.TRUE.equals(request.getHideDocument())) {
            Document document = report.getDocument();
            if (document != null && document.getStatus() == DocumentStatus.ACTIVE) {
                document.setStatus(DocumentStatus.DELETED);
                document.setUpdatedAt(LocalDateTime.now());
            }
        }

        DocumentReport saved = reportRepository.save(report);

        notificationService.create(
                saved.getReporter(),
                NotificationType.REPORT_RESOLVED,
                "Your report was handled",
                "Your report for document \"" + saved.getDocument().getTitle() + "\" is now " + saved.getStatus().name(),
                "DOCUMENT_REPORT",
                saved.getId(),
                "/document-reports/" + saved.getId()
        );

        notificationService.create(
                saved.getOwner(),
                NotificationType.REPORT_RESOLVED,
                "A report for your document was handled",
                "Report for document \"" + saved.getDocument().getTitle() + "\" is now " + saved.getStatus().name(),
                "DOCUMENT_REPORT",
                saved.getId(),
                "/documents/" + saved.getDocument().getId()
        );

        historyRepository.save(DocumentReportHistory.builder()
                .report(saved)
                .oldStatus(oldStatus)
                .newStatus(saved.getStatus())
                .adminNote(saved.getAdminNote())
                .handledBy(handler)
                .build());

        return toResponse(saved);
    }

    private DocumentReport findReport(Long reportId) {
        return reportRepository.findById(reportId)
                .orElseThrow(() -> new NotFoundException("Document report not found"));
    }

    private DocumentReportResponse toResponse(DocumentReport report) {
        Document document = report.getDocument();
        User reporter = report.getReporter();
        User owner = report.getOwner();
        User handledBy = report.getHandledBy();

        return DocumentReportResponse.builder()
                .id(report.getId())
                .documentId(document != null ? document.getId() : null)
                .documentTitle(document != null ? document.getTitle() : null)
                .reporterId(reporter != null ? reporter.getId() : null)
                .reporterEmail(reporter != null ? reporter.getEmail() : null)
                .ownerId(owner != null ? owner.getId() : null)
                .ownerEmail(owner != null ? owner.getEmail() : null)
                .reason(report.getReason() != null ? report.getReason().name() : null)
                .description(report.getDescription())
                .status(report.getStatus() != null ? report.getStatus().name() : null)
                .adminNote(report.getAdminNote())
                .handledById(handledBy != null ? handledBy.getId() : null)
                .handledByEmail(handledBy != null ? handledBy.getEmail() : null)
                .handledAt(report.getHandledAt())
                .createdAt(report.getCreatedAt())
                .updatedAt(report.getUpdatedAt())
                .build();
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
