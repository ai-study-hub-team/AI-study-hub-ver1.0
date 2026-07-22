package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.response.SharedDocumentSubmissionResponse;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.service.CurrentUserService;
import com.aistudyhub.backend.service.DocumentShareLinkService;
import com.aistudyhub.backend.service.SharedDocumentSubmissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * Authenticated endpoint for uploading files through a share link.
 *
 * <pre>
 * POST /api/share-uploads/{token}/submissions
 * </pre>
 *
 * Requires: JWT authentication (Spring Security enforces this).
 * The old anonymous endpoint at {@code /api/public/.../submissions} has been removed.
 *
 * <p>The uploader identity (name, email, userId) is derived exclusively from the
 * authenticated JWT principal — the client must NOT send these in the request.
 */
@RestController
@RequestMapping("/api/share-uploads")
@RequiredArgsConstructor
public class AuthenticatedShareUploadController {

    private final SharedDocumentSubmissionService submissionService;
    private final DocumentShareLinkService shareLinkService;
    private final CurrentUserService currentUserService;

    /**
     * POST /api/share-uploads/{token}/submissions
     *
     * <p>Requires a valid JWT. The token is the plain share-link token from the URL.
     *
     * @param token       the plain share-link token
     * @param file        the file to upload
     * @param title       optional submission title
     * @param description optional description
     */
    @PostMapping(value = "/{token}/submissions",
                 consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<SharedDocumentSubmissionResponse> submitFile(
            @PathVariable String token,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title",       required = false) String title,
            @RequestParam(value = "description", required = false) String description) {

        User uploader = currentUserService.getCurrentUser();

        SharedDocumentSubmissionResponse response = submissionService.handleAuthenticatedUpload(
                token, file, title, description, uploader, shareLinkService);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
