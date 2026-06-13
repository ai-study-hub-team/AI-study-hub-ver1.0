package com.aistudyhub.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Join table linking a ChatSession to the Documents selected for that session.
 * One session can reference up to 5 documents (enforced at the service layer).
 */
@Entity
@Table(name = "chat_session_documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatSessionDocument {

    @Id
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    // Many ChatSessionDocuments -> One ChatSession
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private ChatSession chatSession;

    // Many ChatSessionDocuments -> One Document
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    private LocalDateTime createdAt;
}
