package com.aistudyhub.backend.service;

import lombok.extern.slf4j.Slf4j;
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
@Slf4j
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
     * Deletes a stored file from the main uploads directory.
     * Silently returns if the file does not exist (idempotent).
     *
     * @param fileName the stored UUID-based file name (e.g. {@code "abc123.pdf"})
     */
    public void deleteFile(String fileName) {
        if (fileName == null || fileName.isBlank()) return;
        try {
            Path filePath = Paths.get(uploadDir).resolve(fileName).normalize();
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete file: " + fileName, e);
        }
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

        switch (ext) {
            // Documents
            case "pdf":
                return "application/pdf";
            case "txt":
                return "text/plain";
            case "docx":
                return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "ppt":
                return "application/vnd.ms-powerpoint";
            case "pptx":
                return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            case "xls":
                return "application/vnd.ms-excel";
            case "xlsx":
                return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

            // Images
            case "png":
                return "image/png";
            case "jpg":
            case "jpeg":
                return "image/jpeg";
            case "webp":
                return "image/webp";
            case "gif":
                return "image/gif";

            // Videos
            case "mp4":
                return "video/mp4";
            case "mov":
                return "video/quicktime";
            case "avi":
                return "video/x-msvideo";
            case "mkv":
                return "video/x-matroska";

            // Audio
            case "mp3":
                return "audio/mpeg";
            case "wav":
                return "audio/wav";
            case "m4a":
                return "audio/x-m4a";
            case "ogg":
                return "audio/ogg";

            default:
                return "application/octet-stream";
        }
    }

    // ─── Shared Submission Storage ──────────────────────────────────────────────

    /**
     * Saves a file uploaded through a public share link into a dedicated
     * {@code shared-submissions/} sub-directory, separate from normal uploads.
     *
     * @param file the multipart file from User B
     * @return the stored unique file name (e.g. {@code "abc123.pdf"})
     * @throws IOException if saving fails
     */
    public String saveSharedSubmissionFile(MultipartFile file) throws IOException {
        String originalFileName = file.getOriginalFilename();
        if (originalFileName == null || originalFileName.isBlank()) {
            throw new IllegalArgumentException("File name must not be empty");
        }
        String extension = getExtension(originalFileName).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Unsupported file type: ." + extension);
        }
        Path submissionsDir = Paths.get(uploadDir, "shared-submissions");
        if (!Files.exists(submissionsDir)) {
            Files.createDirectories(submissionsDir);
        }
        String uniqueFileName = UUID.randomUUID().toString().replace("-", "") + "." + extension;
        Path targetPath = submissionsDir.resolve(uniqueFileName);
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
        return uniqueFileName;
    }

    /**
     * Returns the actual byte count of a staged shared-submission file.
     * Used to verify the true size after writing, independent of the client-reported value.
     */
    public long getSharedSubmissionFileSize(String storedFileName) {
        try {
            Path path = Paths.get(uploadDir, "shared-submissions")
                    .resolve(storedFileName).normalize();
            return Files.size(path);
        } catch (IOException e) {
            throw new RuntimeException("Cannot read size of staged file: " + storedFileName, e);
        }
    }

    /**
     * Returns the relative stored path for a shared submission file.
     * e.g. {@code "uploads/shared-submissions/abc123.pdf"}
     */
    public String getSharedSubmissionFilePath(String storedFileName) {
        return uploadDir + "/shared-submissions/" + storedFileName;
    }

    /**
     * Copies an approved shared-submission file into the main uploads directory
     * so the normal AI processing pipeline can access it the same way as a direct upload.
     *
     * @param submissionFileName the UUID-based file name stored in shared-submissions/
     * @return the new unique file name in the main uploads/ directory
     * @throws IOException if copy fails
     */
    public String copySharedSubmissionToUploads(String submissionFileName) throws IOException {
        Path src = Paths.get(uploadDir, "shared-submissions", submissionFileName).toAbsolutePath();
        if (!Files.exists(src)) {
            throw new RuntimeException("Shared submission file not found: " + src);
        }
        String extension = getExtension(submissionFileName);
        String newFileName = UUID.randomUUID().toString().replace("-", "")
                + (extension.isBlank() ? "" : "." + extension);
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }
        Path dest = uploadPath.resolve(newFileName);
        Files.copy(src, dest, StandardCopyOption.REPLACE_EXISTING);
        return newFileName;
    }

    /**
     * Loads a shared-submission file from {@code uploads/shared-submissions/} as a Spring Resource.
     * Used by the owner (User A) to view or download the file before approving/rejecting.
     *
     * @param storedFileName the UUID-based file name stored under shared-submissions/
     * @return a readable Resource
     * @throws RuntimeException if the file does not exist or cannot be read
     */
    public Resource loadSharedSubmissionFileAsResource(String storedFileName) {
        try {
            Path filePath = Paths.get(uploadDir, "shared-submissions")
                    .resolve(storedFileName).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException(
                        "Shared submission file not found or not readable: " + storedFileName);
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("Invalid shared submission file path: " + storedFileName, e);
        }
    }

    /**
     * Deletes a staged file from {@code uploads/shared-submissions/} directory.
     *
     * <p>Safety guarantees:</p>
     * <ul>
     *   <li>Only resolves paths inside {@code uploads/shared-submissions/} — never touches
     *       files in the main uploads directory.</li>
     *   <li>Normalizes the resolved path and verifies it starts with the expected base directory
     *       to prevent path-traversal attacks.</li>
     *   <li>Uses {@code Files.deleteIfExists} — if the file is already gone, this is a no-op.</li>
     * </ul>
     *
     * @param storedFileName the UUID-based file name (e.g. {@code "abc123.pdf"})
     */
    public void deleteSharedSubmissionFile(String storedFileName) {
        if (storedFileName == null || storedFileName.isBlank()) return;
        try {
            Path baseDir = Paths.get(uploadDir, "shared-submissions").toAbsolutePath().normalize();
            Path targetPath = baseDir.resolve(storedFileName).normalize();

            // Path-traversal guard: resolved path must stay inside shared-submissions/
            if (!targetPath.startsWith(baseDir)) {
                throw new SecurityException(
                        "Path traversal attempt detected for shared submission file: " + storedFileName);
            }

            boolean deleted = Files.deleteIfExists(targetPath);
            if (deleted) {
                log.info("[SharedSubmissionCleanup] Deleted staged file: {}", targetPath);
            } else {
                log.warn("[SharedSubmissionCleanup] File already absent (no-op): {}", targetPath);
            }
        } catch (IOException e) {
            throw new RuntimeException(
                    "Failed to delete shared submission file: " + storedFileName, e);
        }
    }
}