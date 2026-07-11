package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.ChatAskRequest;
import com.aistudyhub.backend.dto.request.CreateChatSessionRequest;
import com.aistudyhub.backend.dto.response.ChatAskResponse;
import com.aistudyhub.backend.dto.response.ChatMessageResponse;
import com.aistudyhub.backend.dto.response.ChatSessionResponse;
import com.aistudyhub.backend.dto.response.CreateChatSessionResponse;
import com.aistudyhub.backend.service.ChatSessionService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class ChatSessionController {

    private final ChatSessionService chatSessionService;

    // POST /api/chat/sessions
    @PostMapping("/sessions")
    public ResponseEntity<CreateChatSessionResponse> createSession(
            @Valid @RequestBody CreateChatSessionRequest request) {
        CreateChatSessionResponse response = chatSessionService.createChatSession(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // POST /api/chat/ask
    @PostMapping("/ask")
    public ResponseEntity<ChatAskResponse> askChatbot(
            @Valid @RequestBody ChatAskRequest request) {
        ChatAskResponse response = chatSessionService.askChatbot(request);
        return ResponseEntity.ok(response);
    }

    // GET /api/chat/sessions
    @GetMapping("/sessions")
    public ResponseEntity<List<ChatSessionResponse>> getSessionsByUserId(
            @RequestParam Long userId) {
        List<ChatSessionResponse> responses = chatSessionService.getSessionsByUserId(userId);
        return ResponseEntity.ok(responses);
    }

    // GET /api/chat/sessions/{sessionId}/messages
    @GetMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<List<ChatMessageResponse>> getSessionHistory(
            @PathVariable String sessionId) {
        List<ChatMessageResponse> responses = chatSessionService.getSessionHistory(sessionId);
        return ResponseEntity.ok(responses);
    }
}
