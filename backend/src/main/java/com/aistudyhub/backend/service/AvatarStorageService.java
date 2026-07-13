package com.aistudyhub.backend.service;

import com.aistudyhub.backend.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
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

@Service
@RequiredArgsConstructor
public class AvatarStorageService {

    private static final List<String> ALLOWED_EXTENSIONS =
            List.of("png", "jpg", "jpeg", "webp");

    private static final List<String> ALLOWED_CONTENT_TYPES =
            List.of("image/png", "image/jpeg", "image/webp");

    private static final String PUBLIC_AVATAR_PREFIX = "/api/public/avatars/";

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Value("${app.avatar.max-size-bytes:5242880}")
    private long maxAvatarSizeBytes;

    public String storeLocalAvatar(MultipartFile file) {
        validateAvatarFile(file);

        String extension = getExtension(file.getOriginalFilename()).toLowerCase();
        String storedFileName = UUID.randomUUID().toString().replace("-", "") + "." + extension;

        try {
            Path avatarsDir = Paths.get(uploadDir, "avatars").toAbsolutePath().normalize();
            Files.createDirectories(avatarsDir);

            Path targetPath = avatarsDir.resolve(storedFileName).normalize();
            if (!targetPath.startsWith(avatarsDir)) {
                throw new BadRequestException("Invalid avatar file path");
            }

            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            return PUBLIC_AVATAR_PREFIX + storedFileName;
        } catch (IOException ex) {
            throw new RuntimeException("Failed to store avatar file", ex);
        }
    }

    public Resource loadLocalAvatar(String fileName) {
        if (fileName == null || fileName.isBlank() || fileName.contains("..")) {
            throw new BadRequestException("Invalid avatar file name");
        }

        try {
            Path avatarsDir = Paths.get(uploadDir, "avatars").toAbsolutePath().normalize();
            Path filePath = avatarsDir.resolve(fileName).normalize();

            if (!filePath.startsWith(avatarsDir)) {
                throw new BadRequestException("Invalid avatar file path");
            }

            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new RuntimeException("Avatar file not found");
            }

            return resource;
        } catch (MalformedURLException ex) {
            throw new RuntimeException("Invalid avatar file path", ex);
        }
    }

    public void deleteLocalAvatarByUrl(String avatarUrl) {
        if (avatarUrl == null || avatarUrl.isBlank()) {
            return;
        }

        if (!avatarUrl.startsWith(PUBLIC_AVATAR_PREFIX)) {
            return;
        }

        String fileName = avatarUrl.substring(PUBLIC_AVATAR_PREFIX.length());
        if (fileName.isBlank() || fileName.contains("..")) {
            return;
        }

        try {
            Path avatarsDir = Paths.get(uploadDir, "avatars").toAbsolutePath().normalize();
            Path filePath = avatarsDir.resolve(fileName).normalize();
            if (filePath.startsWith(avatarsDir)) {
                Files.deleteIfExists(filePath);
            }
        } catch (IOException ex) {
            // Khong nen fail request chi vi xoa avatar cu loi.
        }
    }

    public String detectAvatarMimeType(String fileName) {
        String extension = getExtension(fileName).toLowerCase();
        return switch (extension) {
            case "png" -> "image/png";
            case "jpg", "jpeg" -> "image/jpeg";
            case "webp" -> "image/webp";
            default -> "application/octet-stream";
        };
    }

    private void validateAvatarFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Avatar file is required");
        }

        if (file.getSize() > maxAvatarSizeBytes) {
            throw new BadRequestException("Avatar file must not exceed 5MB");
        }

        String originalFilename = file.getOriginalFilename();
        String extension = getExtension(originalFilename).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("Avatar must be png, jpg, jpeg, or webp");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new BadRequestException("Avatar content type must be image/png, image/jpeg, or image/webp");
        }
    }

    private String getExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf('.') + 1);
    }
}