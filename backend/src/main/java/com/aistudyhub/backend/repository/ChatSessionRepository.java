package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, String> {

    // Find all sessions belonging to a specific user (ordered newest first)
    List<ChatSession> findByUserIdOrderByCreatedAtDesc(Long userId);
}
