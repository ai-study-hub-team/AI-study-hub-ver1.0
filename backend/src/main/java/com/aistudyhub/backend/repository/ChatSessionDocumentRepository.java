package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.ChatSessionDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatSessionDocumentRepository extends JpaRepository<ChatSessionDocument, String> {

    // Find all document links for a given session
    List<ChatSessionDocument> findByChatSessionSessionId(String sessionId);
}
