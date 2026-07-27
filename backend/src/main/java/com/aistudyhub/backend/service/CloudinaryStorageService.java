package com.aistudyhub.backend.service;

import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CloudinaryStorageService {

    private static final String STORAGE_PROVIDER = "CLOUDINARY";
    private static final List<String> IMAGE_EXTENSIONS = List.of("png", "jpg", "jpeg", "webp", "gif");
    private static final List<String> VIDEO_EXTENSIONS = List.of("mp4", "mov", "avi", "mkv", "mp3", "wav", "m4a", "ogg");

    @Value("${cloudinary.cloud-name:}")
    private String cloudName;

    @Value("${cloudinary.api-key:}")
    private String apiKey;

    @Value("${cloudinary.api-secret:}")
    private String apiSecret;

    private final RestTemplate restTemplate = new RestTemplate();

    public UploadResult upload(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        String extension = getExtension(originalFilename).toLowerCase();
        String resourceType = resolveResourceType(extension);
        String publicId = buildPublicId(resourceType, extension);

        return uploadResource(file.getResource(), originalFilename, file.getSize(), resourceType, publicId);
    }

    public UploadResult upload(Resource resource, String originalFilename, long fileSize) {
        String extension = getExtension(originalFilename).toLowerCase();
        String resourceType = resolveResourceType(extension);
        String publicId = buildPublicId(resourceType, extension);

        return uploadResource(resource, originalFilename, fileSize, resourceType, publicId);
    }

    /**
     * Deletes a Cloudinary object by public ID.
     *
     * @param publicId     the Cloudinary public_id
     * @param resourceType the resource_type (image / video / raw); null defaults to "image"
     * @throws RuntimeException if the Cloudinary API returns an error response
     */
    public void delete(String publicId, String resourceType) {
        ensureConfigured();
        if (resourceType == null || resourceType.isBlank()) resourceType = "raw";

        long timestamp = Instant.now().getEpochSecond();
        String signature = signDestroy(publicId, timestamp);
        String url = "https://api.cloudinary.com/v1_1/" + cloudName + "/" + resourceType + "/destroy";

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("public_id", publicId);
        body.add("api_key", apiKey);
        body.add("timestamp", timestamp);
        body.add("signature", signature);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        ResponseEntity<Map> response = restTemplate.postForEntity(
                url, new HttpEntity<>(body, headers), Map.class);

        Map<?, ?> responseBody = response.getBody();
        if (!response.getStatusCode().is2xxSuccessful() || responseBody == null) {
            throw new RuntimeException("Cloudinary delete failed with status: " + response.getStatusCode());
        }
        String result = asString(responseBody.get("result"));
        if (result == null || (!result.equals("ok") && !result.equals("not found"))) {
            throw new RuntimeException("Cloudinary delete returned unexpected result: " + result);
        }
    }

    private UploadResult uploadResource(
            Resource resource,
            String originalFilename,
            long fileSize,
            String resourceType,
            String publicId
    ) {
        ensureConfigured();

        long timestamp = Instant.now().getEpochSecond();
        String signature = signUpload(publicId, timestamp);
        String url = "https://api.cloudinary.com/v1_1/" + cloudName + "/" + resourceType + "/upload";

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", resource);
        body.add("api_key", apiKey);
        body.add("timestamp", timestamp);
        body.add("public_id", publicId);
        body.add("signature", signature);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        ResponseEntity<Map> response = restTemplate.postForEntity(
                url,
                new HttpEntity<>(body, headers),
                Map.class
        );

        Map<?, ?> responseBody = response.getBody();
        if (!response.getStatusCode().is2xxSuccessful() || responseBody == null) {
            throw new RuntimeException("Cloudinary upload failed with status: " + response.getStatusCode());
        }

        String secureUrl = asString(responseBody.get("secure_url"));
        String returnedPublicId = asString(responseBody.get("public_id"));
        String returnedResourceType = asString(responseBody.get("resource_type"));

        if (secureUrl == null || secureUrl.isBlank()) {
            throw new RuntimeException("Cloudinary upload response did not include secure_url");
        }

        return UploadResult.builder()
                .publicId(returnedPublicId != null ? returnedPublicId : publicId)
                .secureUrl(secureUrl)
                .resourceType(returnedResourceType != null ? returnedResourceType : resourceType)
                .originalFilename(originalFilename)
                .fileSize(fileSize)
                .storageProvider(STORAGE_PROVIDER)
                .build();
    }

    private void ensureConfigured() {
        if (isBlank(cloudName) || isBlank(apiKey) || isBlank(apiSecret)) {
            throw new IllegalStateException(
                    "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
            );
        }
    }

    private String signUpload(String publicId, long timestamp) {
        String payload = "public_id=" + publicId + "&timestamp=" + timestamp + apiSecret;
        return sha1Hex(payload);
    }

    private String signDestroy(String publicId, long timestamp) {
        String payload = "public_id=" + publicId + "&timestamp=" + timestamp + apiSecret;
        return sha1Hex(payload);
    }

    private String sha1Hex(String payload) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-1");
            byte[] hash = digest.digest(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("Could not sign Cloudinary request", e);
        }
    }

    private String buildPublicId(String resourceType, String extension) {
        String id = "ai-study-hub/documents/" + UUID.randomUUID().toString().replace("-", "");
        if ("raw".equals(resourceType) && !isBlank(extension)) {
            return id + "." + extension;
        }
        return id;
    }

    private String resolveResourceType(String extension) {
        if (IMAGE_EXTENSIONS.contains(extension)) {
            return "image";
        }
        if (VIDEO_EXTENSIONS.contains(extension)) {
            return "video";
        }
        return "raw";
    }

    private String getExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf('.') + 1);
    }

    private String asString(Object value) {
        return value instanceof String text ? text : null;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    @Getter
    @Builder
    public static class UploadResult {
        private String publicId;
        private String secureUrl;
        private String resourceType;
        private String originalFilename;
        private long fileSize;
        private String storageProvider;
    }
}
