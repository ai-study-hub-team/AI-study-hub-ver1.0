package com.aistudyhub.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
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
    private static final List<String> ALLOWED_EXTENSIONS = List.of(
            // Documents
            "pdf", "docx", "pptx", "txt", "xls", "xlsx", "ppt",

            // Images
            "png", "jpg", "jpeg", "webp", "gif",

            // Videos
            "mp4", "mov", "avi", "mkv",

            // Audio
            "mp3", "wav", "m4a", "ogg"
    );

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
        String originalFileName = file.getOriginalFilename();

        if (originalFileName == null || originalFileName.isBlank()) {
            throw new IllegalArgumentException("File name must not be empty");
        }

        String extension = getExtension(originalFileName).toLowerCase();

        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException(
                    "Unsupported file type: ." + extension +
                            ". Allowed types: pdf, docx, pptx, txt, xls, xlsx, ppt, " +
                            "png, jpg, jpeg, webp, gif, " +
                            "mp4, mov, avi, mkv, " +
                            "mp3, wav, m4a, ogg"
            );
        }

        // Create the uploads directory if it doesn't exist yet
        Path uploadPath = Paths.get(uploadDir);

        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // Không dùng tên file gốc để lưu vật lý nữa
        // Tránh lỗi tiếng Việt có dấu khi Python upload Gemini
        // Ví dụ: "ảnh có chữ.jpg" -> "a1b2c3d4e5f67890.jpg"
        String uniqueFileName = UUID.randomUUID().toString().replace("-", "")
                + "." + extension;

        // Save the file bytes to disk
        Path targetPath = uploadPath.resolve(uniqueFileName);
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        return uniqueFileName;
    }
    /**
     * Returns the MIME type of the file.
     * Falls back to extension-based detection if MultipartFile content type is unknown.
     */
    public String detectMimeType(MultipartFile file) {
        String contentType = file.getContentType();

        if (contentType != null && !contentType.isBlank()) {
            return contentType;
        }

        return getMimeTypeFromFileName(file.getOriginalFilename());
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

    /**
     * Loads a stored file from the uploads directory as a Spring Resource.
     * The controller can then stream this directly to the browser.
     *
     * @param fileName the stored file name
     * @return a Resource pointing to the file
     * @throws RuntimeException if the file does not exist or cannot be read
     */
    public Resource loadFileAsResource(String fileName) {
        try {
            Path filePath = Paths.get(uploadDir).resolve(fileName).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("File not found or not readable: " + fileName);
            }

        } catch (MalformedURLException e) {
            throw new RuntimeException("Invalid file path: " + fileName, e);
        }
    }

    /**
     * Returns a MIME type string derived from the file extension.
     * Used when the stored fileType metadata is unavailable.
     *
     * @param fileName the file name (stored or original)
     * @return MIME type string
     */
    public String getMimeTypeFromFileName(String fileName) {
        String ext = getExtension(fileName).toLowerCase();

        return switch (ext) {
            // Documents
            case "pdf" -> "application/pdf";
            case "txt" -> "text/plain";
            case "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "ppt" -> "application/vnd.ms-powerpoint";
            case "pptx" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            case "xls" -> "application/vnd.ms-excel";
            case "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

            // Images
            case "png" -> "image/png";
            case "jpg", "jpeg" -> "image/jpeg";
            case "webp" -> "image/webp";
            case "gif" -> "image/gif";

            // Videos
            case "mp4" -> "video/mp4";
            case "mov" -> "video/quicktime";
            case "avi" -> "video/x-msvideo";
            case "mkv" -> "video/x-matroska";

            // Audio
            case "mp3" -> "audio/mpeg";
            case "wav" -> "audio/wav";
            case "m4a" -> "audio/x-m4a";
            case "ogg" -> "audio/ogg";

            default -> "application/octet-stream";
        };
    }
}