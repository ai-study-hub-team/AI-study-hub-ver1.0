package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.DocumentReport;
import com.aistudyhub.backend.entity.DocumentReportReason;
import com.aistudyhub.backend.entity.DocumentReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;

@Repository
public interface DocumentReportRepository extends JpaRepository<DocumentReport, Long> {

    @Modifying
    @Query("DELETE FROM DocumentReport r WHERE r.document.id = :documentId")
    void deleteByDocumentId(@Param("documentId") Long documentId);

    long countByReporterId(Long reporterId);

    boolean existsByDocumentIdAndReporterIdAndStatusIn(
            Long documentId,
            Long reporterId,
            Collection<DocumentReportStatus> statuses
    );

    @Query(
            value = """
                select r
                from DocumentReport r
                join fetch r.document d
                join fetch r.reporter reporter
                join fetch r.owner owner
                left join fetch r.handledBy handledBy
                where (:status is null or r.status = :status)
                  and (:reason is null or r.reason = :reason)
                order by r.createdAt desc
                """,
            countQuery = """
                select count(r)
                from DocumentReport r
                where (:status is null or r.status = :status)
                  and (:reason is null or r.reason = :reason)
                """
    )
    Page<DocumentReport> searchAdmin(
            @Param("status") DocumentReportStatus status,
            @Param("reason") DocumentReportReason reason,
            Pageable pageable
    );
}
