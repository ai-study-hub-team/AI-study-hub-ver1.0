package com.aistudyhub.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Stores a single message (user prompt or AI reply) within a ChatSession.
 * The role field distinguishes between USER and ASSISTANT messages.
 */
@Entity
@Table(name = "chat_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    @Id
    @Column(name = "message_id", length = 36, nullable = false, updatable = false)
    private String messageId;

    // Many ChatMessages -> One ChatSession
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private ChatSession chatSession;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChatMessageRole role;

    @Lob
    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    private LocalDateTime createdAt;

    // One ChatMessage (ASSISTANT) -> Many AiCitations
    @OneToMany(mappedBy = "aiMessage", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<AiCitation> citations = new ArrayList<>();
}
