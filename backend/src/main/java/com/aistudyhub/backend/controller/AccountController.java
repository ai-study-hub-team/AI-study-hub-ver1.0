package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.ChangePasswordRequest;
import com.aistudyhub.backend.dto.request.UpdateProfileRequest;
import com.aistudyhub.backend.dto.response.UserResponse;
import com.aistudyhub.backend.service.UserService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/account")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class AccountController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMe(
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                userService.getByEmail(authentication.getName())
        );
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateMe(
            Authentication authentication,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        return ResponseEntity.ok(
                userService.updateCurrentUser(authentication.getName(), request)
        );
    }


    @PutMapping("/change-password")
    public ResponseEntity<UserResponse> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        return ResponseEntity.ok(
                userService.changeCurrentUserPassword(
                        authentication.getName(),
                        request
                )
        );
    }


    @PatchMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserResponse> updateMyAvatar(
            Authentication authentication,
            @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.ok(
                userService.updateCurrentUserAvatar(authentication.getName(), file)
        );
    }
}
