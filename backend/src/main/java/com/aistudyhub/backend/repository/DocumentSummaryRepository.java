package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.DocumentSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentSummaryRepository extends JpaRepository<DocumentSummary, Long> {

    List<DocumentSummary> findByUser_IdOrderByCreatedAtDesc(Long userId);

    List<DocumentSummary> findByDocument_IdOrderByCreatedAtDesc(Long documentId);
}
