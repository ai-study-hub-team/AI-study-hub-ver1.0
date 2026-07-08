package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.ShareRequest;
import com.aistudyhub.backend.dto.response.ShareResultResponse;
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
    public ResponseEntity<ShareResultResponse> shareFolder(
            @PathVariable Long folderId,
            @Valid @RequestBody ShareRequest request
    ) {
        return ResponseEntity.ok(folderShareService.shareFolder(folderId, request));
    }

    @GetMapping
    public ResponseEntity<List<SharedUserResponse>> getFolderShares(
            @PathVariable Long folderId
    ) {
        return ResponseEntity.ok(folderShareService.getFolderShares(folderId));
    }

    @DeleteMapping("/{targetUserId}")
    public ResponseEntity<Void> revokeFolderShare(
            @PathVariable Long folderId,
            @PathVariable Long targetUserId
    ) {
        folderShareService.revokeFolderShare(folderId, targetUserId);
        return ResponseEntity.noContent().build();
    }
}


