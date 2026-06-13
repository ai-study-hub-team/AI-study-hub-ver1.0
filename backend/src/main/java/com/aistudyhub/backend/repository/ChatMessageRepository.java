package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.ChatMessage;
import com.aistudyhub.backend.entity.ChatMessageRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, String> {

    // Retrieve all messages in a session ordered chronologically
    List<ChatMessage> findByChatSessionSessionIdOrderByCreatedAtAsc(String sessionId);

    // Retrieve messages by role within a session
    List<ChatMessage> findByChatSessionSessionIdAndRole(String sessionId, ChatMessageRole role);
}
