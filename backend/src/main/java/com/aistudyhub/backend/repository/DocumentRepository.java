package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.Document;
import com.aistudyhub.backend.entity.DocumentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    // Get all ACTIVE documents (paginated)
    Page<Document> findByStatus(DocumentStatus status, Pageable pageable);

    // Search by keyword in title, description, or tags (case-insensitive, ACTIVE only)
    @Query("SELECT d FROM Document d WHERE d.status = 'ACTIVE' AND " +
           "(LOWER(d.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(d.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(d.tags) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Document> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);
}
