package com.aistudyhub.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Represents a single chat conversation session between a user and the AI.
 * A session holds context over multiple messages and references the documents
 * the user selected to chat about.
 */
@Entity
@Table(name = "chat_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatSession {

    @Id
    @Column(name = "session_id", length = 36, nullable = false, updatable = false)
    private String sessionId;

    // Many ChatSessions -> One User
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String title;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    // One ChatSession -> Many ChatSessionDocuments (added when user sends a question)
    @OneToMany(mappedBy = "chatSession", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ChatSessionDocument> sessionDocuments = new ArrayList<>();

    // One ChatSession -> Many ChatMessages (added when user sends a question)
    @OneToMany(mappedBy = "chatSession", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ChatMessage> messages = new ArrayList<>();

    // One ChatSession -> Many AiCitations (optional, only when AI uses document chunks)
    @OneToMany(mappedBy = "chatSession", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<AiCitation> citations = new ArrayList<>();
}
