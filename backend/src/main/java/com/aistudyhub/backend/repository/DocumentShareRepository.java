package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.DocumentShare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DocumentShareRepository extends JpaRepository<DocumentShare, Long> {
    boolean existsByDocumentIdAndSharedWithId(Long documentId, Long sharedWithUserId);
}

