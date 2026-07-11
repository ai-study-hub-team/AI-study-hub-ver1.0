package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.AiCitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface AiCitationRepository extends JpaRepository<AiCitation, String> {

    // Retrieve all citations for a given AI message, sorted by score descending
    List<AiCitation> findByAiMessageMessageIdOrderByScoreDesc(String messageId);

    // Delete all citations for a given document (used during permanent delete)
    @Modifying
    @Transactional
    @Query("DELETE FROM AiCitation c WHERE c.document.id = :documentId")
    void deleteByDocumentId(@Param("documentId") Long documentId);
}
