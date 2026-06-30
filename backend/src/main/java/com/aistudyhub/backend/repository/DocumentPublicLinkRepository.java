package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.DocumentPublicLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DocumentPublicLinkRepository extends JpaRepository<DocumentPublicLink, Long> {

    Optional<DocumentPublicLink> findByToken(String token);

    Optional<DocumentPublicLink> findByDocumentIdAndIsActiveTrue(Long documentId);

    Optional<DocumentPublicLink> findByDocumentId(Long documentId);

    boolean existsByToken(String token);
}

