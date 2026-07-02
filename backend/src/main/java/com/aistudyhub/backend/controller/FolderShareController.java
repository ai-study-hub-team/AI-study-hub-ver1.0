package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.ShareFolderRequest;
import com.aistudyhub.backend.dto.response.ShareDocumentResponse;
import com.aistudyhub.backend.dto.response.SharedUserResponse;
import com.aistudyhub.backend.service.FolderShareService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/folders/{folderId}/shares")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Folder Shares")
public class FolderShareController {

    private final FolderShareService folderShareService;

    @PostMapping
    public ResponseEntity<ShareDocumentResponse> shareFolder(
            @PathVariable Long folderId,
            @Valid @RequestBody ShareFolderRequest request
    ) {
        return ResponseEntity.ok(folderShareService.shareFolder(folderId, request));
    }

    @GetMapping
    public ResponseEntity<List<SharedUserResponse>> getFolderShares(
            @PathVariable Long folderId
    ) {
        return ResponseEntity.ok(folderShareService.getFolderShares(folderId));
    }

    @PatchMapping("/{shareId}/revoke")
    public ResponseEntity<Void> revokeFolderShare(
            @PathVariable Long folderId,
            @PathVariable Long shareId
    ) {
        folderShareService.revokeFolderShare(folderId, shareId);
        return ResponseEntity.noContent().build();
    }
}

