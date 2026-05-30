package com.aistudyhub.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "cloud_files")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CloudFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Original file name given by the user
    private String originalName;

    // Where the file is stored (placeholder URL for now)
    private String fileUrl;

    // File type / MIME type, e.g. "application/pdf"
    private String fileType;

    // File size in bytes
    private Long fileSize;

    private LocalDateTime uploadedAt;

    // One CloudFile belongs to one Document
    @OneToOne(mappedBy = "cloudFile")
    private Document document;
}
