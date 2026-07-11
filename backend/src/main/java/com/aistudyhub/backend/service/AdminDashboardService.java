package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.projection.AdminRevenueDailyAggregate;
import com.aistudyhub.backend.dto.response.AdminActiveUserResponse;
import com.aistudyhub.backend.dto.response.AdminRevenueDailyResponse;
import com.aistudyhub.backend.dto.response.AdminRevenueResponse;
import com.aistudyhub.backend.dto.response.AdminStorageDocumentResponse;
import com.aistudyhub.backend.dto.response.AdminStorageReportResponse;
import com.aistudyhub.backend.dto.response.AdminUserStorageResponse;
import com.aistudyhub.backend.entity.CloudFile;
import com.aistudyhub.backend.entity.Document;
import com.aistudyhub.backend.entity.DocumentStatus;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.enums.PaymentStatus;
import com.aistudyhub.backend.exception.BadRequestException;
import com.aistudyhub.backend.exception.NotFoundException;
import com.aistudyhub.backend.repository.DocumentRepository;
import com.aistudyhub.backend.repository.PaymentTransactionRepository;
import com.aistudyhub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private static final String CURRENCY_VND = "VND";

    private final UserRepository userRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final DocumentRepository documentRepository;

    @Transactional(readOnly = true)
    public List<AdminActiveUserResponse> getActiveUsers() {
        return userRepository.findActiveUserResponses();
    }

    @Transactional(readOnly = true)
    public AdminRevenueResponse getRevenue(
            String period,
            LocalDate date,
            LocalDate fromDate,
            LocalDate toDate
    ) {
        if (period == null || period.isBlank()) {
            return getAllTimeRevenue();
        }

        RevenueDateRange range = resolveRevenueDateRange(period, date, fromDate, toDate);
        List<AdminRevenueDailyResponse> dailyRevenue = buildDailyRevenue(range);
        BigDecimal totalRevenue = dailyRevenue.stream()
                .map(AdminRevenueDailyResponse::getTotalRevenue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long successfulTransactionCount = dailyRevenue.stream()
                .mapToLong(AdminRevenueDailyResponse::getSuccessfulTransactionCount)
                .sum();

        return AdminRevenueResponse.builder()
                .totalRevenue(totalRevenue)
                .successfulTransactionCount(successfulTransactionCount)
                .currency(CURRENCY_VND)
                .period(range.period())
                .fromDate(range.fromDate())
                .toDate(range.toDate())
                .numberOfDays(ChronoUnit.DAYS.between(range.fromDate(), range.toDate()) + 1)
                .dailyRevenue(dailyRevenue)
                .build();
    }

    private AdminRevenueResponse getAllTimeRevenue() {
        BigDecimal totalRevenue = paymentTransactionRepository.calculateTotalSuccessfulRevenue();
        if (totalRevenue == null) {
            totalRevenue = BigDecimal.ZERO;
        }

        return AdminRevenueResponse.builder()
                .totalRevenue(totalRevenue)
                .successfulTransactionCount(paymentTransactionRepository.countByStatus(PaymentStatus.SUCCESS))
                .currency(CURRENCY_VND)
                .build();
    }

    private List<AdminRevenueDailyResponse> buildDailyRevenue(RevenueDateRange range) {
        List<AdminRevenueDailyAggregate> rows = paymentTransactionRepository
                .aggregateSuccessfulRevenueByDateRange(range.fromDate(), range.toDate());

        Map<LocalDate, AdminRevenueDailyResponse> revenueByDate = new LinkedHashMap<>();
        for (LocalDate current = range.fromDate(); !current.isAfter(range.toDate()); current = current.plusDays(1)) {
            revenueByDate.put(current, zeroRevenue(current));
        }

        for (AdminRevenueDailyAggregate row : rows) {
            revenueByDate.put(row.getRevenueDate(), AdminRevenueDailyResponse.builder()
                    .date(row.getRevenueDate())
                    .totalRevenue(safeMoney(row.getTotalRevenue()))
                    .successfulTransactionCount(safeCount(row.getSuccessfulTransactionCount()))
                    .build());
        }

        return revenueByDate.values().stream().toList();
    }

    private RevenueDateRange resolveRevenueDateRange(
            String period,
            LocalDate date,
            LocalDate fromDate,
            LocalDate toDate
    ) {
        String normalizedPeriod = period.trim().toUpperCase(Locale.ROOT);
        LocalDate baseDate = date != null ? date : LocalDate.now();

        return switch (normalizedPeriod) {
            case "DAY" -> new RevenueDateRange(normalizedPeriod, baseDate, baseDate);
            case "WEEK" -> new RevenueDateRange(
                    normalizedPeriod,
                    baseDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)),
                    baseDate.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY))
            );
            case "MONTH" -> new RevenueDateRange(
                    normalizedPeriod,
                    baseDate.withDayOfMonth(1),
                    baseDate.withDayOfMonth(baseDate.lengthOfMonth())
            );
            case "CUSTOM" -> {
                if (fromDate == null || toDate == null) {
                    throw new BadRequestException("fromDate and toDate are required when period=CUSTOM.");
                }
                if (fromDate.isAfter(toDate)) {
                    throw new BadRequestException("fromDate must be before or equal to toDate.");
                }
                yield new RevenueDateRange(normalizedPeriod, fromDate, toDate);
            }
            default -> throw new BadRequestException("Invalid period. Allowed values: DAY, WEEK, MONTH, CUSTOM.");
        };
    }

    private AdminRevenueDailyResponse zeroRevenue(LocalDate date) {
        return AdminRevenueDailyResponse.builder()
                .date(date)
                .totalRevenue(BigDecimal.ZERO)
                .successfulTransactionCount(0L)
                .build();
    }

    @Transactional(readOnly = true)
    public AdminStorageReportResponse getStorageReport(Long userId) {
        if (userId != null) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new NotFoundException("User not found with id: " + userId));
            List<Document> documents = documentRepository.findByUserIdAndStatusWithCloudFile(
                    userId,
                    DocumentStatus.ACTIVE
            );
            AdminUserStorageResponse userStorage = toUserStorageResponse(user, documents);

            return AdminStorageReportResponse.builder()
                    .scope("SINGLE_USER")
                    .userId(userId)
                    .totalStorageBytes(userStorage.getTotalStorageBytes())
                    .userCount(1)
                    .documentCount(userStorage.getDocumentCount())
                    .users(List.of(userStorage))
                    .build();
        }

        List<User> users = userRepository.findAll(Sort.by(Sort.Direction.ASC, "id"));
        List<Document> documents = documentRepository.findAllWithUserAndCloudFileByStatus(DocumentStatus.ACTIVE);
        Map<Long, List<Document>> documentsByUserId = groupDocumentsByUserId(documents);

        List<AdminUserStorageResponse> userReports = users.stream()
                .map(user -> toUserStorageResponse(
                        user,
                        documentsByUserId.getOrDefault(user.getId(), List.of())
                ))
                .toList();

        long totalStorageBytes = userReports.stream()
                .mapToLong(AdminUserStorageResponse::getTotalStorageBytes)
                .sum();
        int documentCount = userReports.stream()
                .mapToInt(AdminUserStorageResponse::getDocumentCount)
                .sum();

        return AdminStorageReportResponse.builder()
                .scope("ALL_USERS")
                .userId(null)
                .totalStorageBytes(totalStorageBytes)
                .userCount(userReports.size())
                .documentCount(documentCount)
                .users(userReports)
                .build();
    }

    private Map<Long, List<Document>> groupDocumentsByUserId(List<Document> documents) {
        Map<Long, List<Document>> documentsByUserId = new LinkedHashMap<>();
        for (Document document : documents) {
            if (document.getUser() == null || document.getUser().getId() == null) {
                continue;
            }
            documentsByUserId
                    .computeIfAbsent(document.getUser().getId(), ignored -> new ArrayList<>())
                    .add(document);
        }
        return documentsByUserId;
    }

    private AdminUserStorageResponse toUserStorageResponse(User user, List<Document> documents) {
        List<AdminStorageDocumentResponse> documentResponses = documents.stream()
                .map(this::toStorageDocumentResponse)
                .toList();

        long totalStorageBytes = documentResponses.stream()
                .mapToLong(document -> safeBytes(document.getFileSizeBytes()))
                .sum();

        return AdminUserStorageResponse.builder()
                .userId(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .totalStorageBytes(totalStorageBytes)
                .documentCount(documentResponses.size())
                .documents(documentResponses)
                .build();
    }

    private AdminStorageDocumentResponse toStorageDocumentResponse(Document document) {
        CloudFile cloudFile = document.getCloudFile();

        return AdminStorageDocumentResponse.builder()
                .documentId(document.getId())
                .title(document.getTitle())
                .fileName(cloudFile != null ? cloudFile.getFileName() : null)
                .originalName(cloudFile != null ? cloudFile.getOriginalName() : null)
                .fileType(cloudFile != null ? cloudFile.getFileType() : null)
                .fileSizeBytes(cloudFile != null ? safeBytes(cloudFile.getFileSize()) : 0L)
                .uploadedAt(cloudFile != null ? cloudFile.getUploadedAt() : null)
                .build();
    }

    private long safeBytes(Long bytes) {
        return bytes == null ? 0L : bytes;
    }

    private BigDecimal safeMoney(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : amount;
    }

    private long safeCount(Long count) {
        return count == null ? 0L : count;
    }

    private record RevenueDateRange(String period, LocalDate fromDate, LocalDate toDate) {
    }
}
