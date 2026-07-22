package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.response.DocumentResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
public class DocumentFileService {

    private final DocumentService documentService;
    private final FileStorageService fileStorageService;

    public ResponseEntity<?> viewFile(Long documentId) {
        DocumentResponse document = documentService.getById(documentId);
        if (isRemoteUrl(document.getFileUrl())) {
            return redirectTo(document.getFileUrl());
        }

        String fileName = document.getFileName();
        if (fileName == null || fileName.isBlank()) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = fileStorageService.loadFileAsResource(fileName);
        String mimeType = document.getFileType() != null
                ? document.getFileType()
                : fileStorageService.getMimeTypeFromFileName(fileName);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(
                ContentDisposition.inline().filename(fileName, StandardCharsets.UTF_8).build()
        );

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType(mimeType))
                .body(resource);
    }

    public ResponseEntity<?> downloadFile(Long documentId) {
        DocumentResponse document = documentService.getDownloadableById(documentId);
        if (isRemoteUrl(document.getFileUrl())) {
            return redirectTo(document.getFileUrl());
        }

        String fileName = document.getFileName();
        if (fileName == null || fileName.isBlank()) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = fileStorageService.loadFileAsResource(fileName);
        String mimeType = document.getFileType() != null
                ? document.getFileType()
                : fileStorageService.getMimeTypeFromFileName(fileName);
        String downloadName = document.getOriginalName() != null && !document.getOriginalName().isBlank()
                ? document.getOriginalName()
                : fileName;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(
                ContentDisposition.attachment().filename(downloadName, StandardCharsets.UTF_8).build()
        );

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType(mimeType))
                .body(resource);
    }

    private ResponseEntity<?> redirectTo(String fileUrl) {
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(fileUrl))
                .build();
    }

    private boolean isRemoteUrl(String value) {
        return value != null && (value.startsWith("http://") || value.startsWith("https://"));
    }
}
