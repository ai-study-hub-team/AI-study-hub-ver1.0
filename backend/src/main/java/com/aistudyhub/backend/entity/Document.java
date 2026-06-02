package com.aistudyhub.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    // Short description of the document
    private String description;

    // Tags for searching, e.g. "java,spring,backend"
    private String tags;

    // Status: ACTIVE or DELETED (soft delete)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private DocumentStatus status = DocumentStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private DocumentProcessStatus processStatus = DocumentProcessStatus.UPLOADED;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    // Many Documents -> One User
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    // Many Documents -> One Category
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    // One Document -> One CloudFile
    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "cloud_file_id", referencedColumnName = "id")
    private CloudFile cloudFile;
}
