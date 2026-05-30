package com.aistudyhub.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

/**
 * Handles saving uploaded files to the local "uploads/" directory.
 * In the future, this can be swapped out for Firebase or S3 storage.
 */
@Service
public class FileStorageService {

    // Allowed file extensions
    private static final List<String> ALLOWED_EXTENSIONS = List.of("pdf", "docx", "pptx", "txt");

    // Read the upload directory path from application.yaml
    // Defaults to "uploads" if not configured
    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    /**
     * Saves the uploaded file to the local upload directory.
     *
     * @param file the uploaded MultipartFile
     * @return the stored file name (UUID + original name), e.g. "a1b2c3_lecture1.pdf"
     * @throws IOException if saving fails
     */
    public String saveFile(MultipartFile file) throws IOException {
        // 1. Validate file extension
        String originalFileName = file.getOriginalFilename();
        String extension = getExtension(originalFileName);
        if (!ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
            throw new IllegalArgumentException(
                "Unsupported file type: ." + extension +
                ". Allowed types: pdf, docx, pptx, txt"
            );
        }

        // 2. Create the uploads directory if it doesn't exist yet
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // 3. Generate a unique file name to avoid overwriting existing files
        //    e.g. "a1b2c3d4_lecture1.pdf"
        String uniqueFileName = UUID.randomUUID().toString().substring(0, 8) + "_" + originalFileName;

        // 4. Save the file bytes to disk
        Path targetPath = uploadPath.resolve(uniqueFileName);
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        return uniqueFileName;
    }

    /**
     * Returns the MIME type of the file.
     * Falls back to "application/octet-stream" if unknown.
     */
    public String detectMimeType(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType != null && !contentType.isBlank()) {
            return contentType;
        }
        // Fallback based on extension
        String ext = getExtension(file.getOriginalFilename()).toLowerCase();
        return switch (ext) {
            case "pdf"  -> "application/pdf";
            case "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "pptx" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            case "txt"  -> "text/plain";
            default     -> "application/octet-stream";
        };
    }

    // ─── Helper ────────────────────────────────────────────────────────────────

    /**
     * Extracts the file extension from a file name.
     * e.g. "lecture1.pdf" → "pdf"
     */
    private String getExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf('.') + 1);
    }
}
