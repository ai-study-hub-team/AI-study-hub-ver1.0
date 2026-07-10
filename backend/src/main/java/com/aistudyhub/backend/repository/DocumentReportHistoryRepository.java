package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.DocumentReportHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DocumentReportHistoryRepository extends JpaRepository<DocumentReportHistory, Long> {
}
