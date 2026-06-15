package com.aistudyhub.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Records which DocumentChunk (and its parent Document) was used by the AI
 * when generating an ASSISTANT message. Used to render source citations in the UI.
 * AiCitation is optional — not every AI response will have citations.
 */
@Entity
@Table(name = "ai_citations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiCitation {

    @Id
    @Column(name = "citation_id", length = 36, nullable = false, updatable = false)
    private String citationId;

    // Many AiCitations -> One ChatSession
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private ChatSession chatSession;

    // Many AiCitations -> One ChatMessage (the ASSISTANT message that used this chunk)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    private ChatMessage aiMessage;

    // Many AiCitations -> One DocumentChunk
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chunk_id", nullable = false)
    private DocumentChunk documentChunk;

    // Many AiCitations -> One Document (denormalized for faster lookups)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    /** Similarity / relevance score returned by the vector search. */
    private Double score;

    /** Zero-based index of the chunk within its parent document. */
    private Integer chunkIndex;

    /** Short preview of the chunk text shown as a citation excerpt in the UI. */
    @Lob
    @Column(columnDefinition = "TEXT")
    private String previewText;

    private LocalDateTime createdAt;
}

