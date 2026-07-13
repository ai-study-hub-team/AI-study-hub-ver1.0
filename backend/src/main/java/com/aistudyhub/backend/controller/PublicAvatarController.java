package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.service.AvatarStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/public/avatars")
@RequiredArgsConstructor
public class PublicAvatarController {

    private final AvatarStorageService avatarStorageService;

    @GetMapping("/{fileName:.+}")
    public ResponseEntity<Resource> viewAvatar(@PathVariable String fileName) {
        Resource resource = avatarStorageService.loadLocalAvatar(fileName);
        String mimeType = avatarStorageService.detectAvatarMimeType(fileName);

        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePublic())
                .contentType(MediaType.parseMediaType(mimeType))
                .body(resource);
    }
}