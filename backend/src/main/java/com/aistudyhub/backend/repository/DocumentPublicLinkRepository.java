package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.DocumentPublicLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DocumentPublicLinkRepository extends JpaRepository<DocumentPublicLink, Long> {

    Optional<DocumentPublicLink> findByToken(String token);

    Optional<DocumentPublicLink> findByDocumentId(Long documentId);

    boolean existsByToken(String token);

    @Modifying
    @Query("DELETE FROM DocumentPublicLink l WHERE l.document.id = :documentId")
    void deleteByDocumentId(@Param("documentId") Long documentId);
}

