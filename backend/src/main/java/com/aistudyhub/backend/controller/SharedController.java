package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.response.SharedItemResponse;
import com.aistudyhub.backend.service.DocumentShareService;
import com.aistudyhub.backend.service.FolderShareService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/shared")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Shared With Me")
public class SharedController {

    private final DocumentShareService documentShareService;
    private final FolderShareService folderShareService;

    @GetMapping("/documents")
    public ResponseEntity<List<SharedItemResponse>> getSharedDocuments() {
        return ResponseEntity.ok(documentShareService.getSharedDocumentsForCurrentUser());
    }

    @GetMapping("/folders")
    public ResponseEntity<List<SharedItemResponse>> getSharedFolders() {
        return ResponseEntity.ok(folderShareService.getSharedFoldersForCurrentUser());
    }

    @GetMapping
    public ResponseEntity<List<SharedItemResponse>> getSharedItems() {
        List<SharedItemResponse> items = new ArrayList<>();
        items.addAll(documentShareService.getSharedDocumentsForCurrentUser());
        items.addAll(folderShareService.getSharedFoldersForCurrentUser());
        return ResponseEntity.ok(items);
    }
}
