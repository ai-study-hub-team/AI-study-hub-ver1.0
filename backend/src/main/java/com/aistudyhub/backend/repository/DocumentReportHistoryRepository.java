package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.DocumentReportHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DocumentReportHistoryRepository extends JpaRepository<DocumentReportHistory, Long> {

    @Modifying
    @Query("DELETE FROM DocumentReportHistory h WHERE h.report.document.id = :documentId")
    void deleteByDocumentId(@Param("documentId") Long documentId);
}
