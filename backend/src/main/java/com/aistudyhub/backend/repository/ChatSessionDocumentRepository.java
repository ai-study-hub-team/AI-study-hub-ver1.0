package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.ChatSessionDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface ChatSessionDocumentRepository extends JpaRepository<ChatSessionDocument, String> {

    // Find all document links for a given session
    List<ChatSessionDocument> findByChatSessionSessionId(String sessionId);

    /**
     * Removes only the document selection from chat sessions. The sessions and
     * their messages remain available after the document is permanently deleted.
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM ChatSessionDocument csd WHERE csd.document.id = :documentId")
    void deleteByDocumentId(@Param("documentId") Long documentId);
}
