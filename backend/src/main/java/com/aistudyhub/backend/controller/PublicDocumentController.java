package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.response.PublicDocumentResponse;
import com.aistudyhub.backend.service.DocumentPublicLinkService;
import com.aistudyhub.backend.service.DocumentPublicLinkService.PublicDocumentFile;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/public/documents")
@RequiredArgsConstructor
@Tag(name = "Public Documents")
public class PublicDocumentController {

    private final DocumentPublicLinkService documentPublicLinkService;

    @GetMapping("/{token}")
    public ResponseEntity<PublicDocumentResponse> getPublicDocument(
            @PathVariable String token
    ) {
        return ResponseEntity.ok(documentPublicLinkService.getPublicDocumentByToken(token));
    }

    @GetMapping("/{token}/file")
    public ResponseEntity<Resource> viewPublicFile(
            @PathVariable String token
    ) {
        PublicDocumentFile file = documentPublicLinkService.getPublicDocumentFile(token, false);
        return buildFileResponse(file, false);
    }

    @GetMapping("/{token}/download")
    public ResponseEntity<Resource> downloadPublicFile(
            @PathVariable String token
    ) {
        PublicDocumentFile file = documentPublicLinkService.getPublicDocumentFile(token, true);
        return buildFileResponse(file, true);
    }

    private ResponseEntity<Resource> buildFileResponse(
            PublicDocumentFile file,
            boolean attachment
    ) {
        String responseFileName = getResponseFileName(file);

        ContentDisposition contentDisposition = attachment
                ? ContentDisposition.attachment().filename(responseFileName, StandardCharsets.UTF_8).build()
                : ContentDisposition.inline().filename(responseFileName, StandardCharsets.UTF_8).build();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(contentDisposition);

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(parseMediaType(file.contentType()))
                .body(file.resource());
    }

    private String getResponseFileName(PublicDocumentFile file) {
        if (file.originalName() != null && !file.originalName().isBlank()) {
            return file.originalName();
        }

        if (file.fileName() != null && !file.fileName().isBlank()) {
            return file.fileName();
        }

        return "document";
    }

    private MediaType parseMediaType(String contentType) {
        try {
            return contentType != null && !contentType.isBlank()
                    ? MediaType.parseMediaType(contentType)
                    : MediaType.APPLICATION_OCTET_STREAM;
        } catch (InvalidMediaTypeException ex) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }
}