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

    // The name used when saving the file on disk (e.g. "uuid_lecture1.pdf")
    private String fileName;

    // The original file name as uploaded by the user (e.g. "lecture1.pdf")
    private String originalName;

    // File type / MIME type, e.g. "application/pdf"
    private String fileType;

    // File size in bytes
    private Long fileSize;

    // Path or URL where the file can be accessed
    // For LOCAL storage: relative path like "uploads/uuid_lecture1.pdf"
    private String fileUrl;

    // Where the file is stored: LOCAL, FIREBASE, S3, etc.
    // Currently only LOCAL is supported
    private String storageProvider;

    private LocalDateTime uploadedAt;

    // One CloudFile belongs to one Document
    @OneToOne(mappedBy = "cloudFile")
    private Document document;
}
