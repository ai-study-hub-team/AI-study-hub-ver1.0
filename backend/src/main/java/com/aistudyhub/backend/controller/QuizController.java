package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.QuizGenerateRequest;
import com.aistudyhub.backend.dto.request.QuizSubmitRequest;
import com.aistudyhub.backend.dto.response.QuizAttemptResponse;
import com.aistudyhub.backend.dto.response.QuizAttemptResultResponse;
import com.aistudyhub.backend.dto.response.QuizGenerateResponse;
import com.aistudyhub.backend.service.QuizAttemptService;
import com.aistudyhub.backend.service.QuizService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/quizzes")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class QuizController {

    private final QuizService quizService;
    private final QuizAttemptService quizAttemptService;

    @PostMapping("/generate")
    public ResponseEntity<QuizGenerateResponse> generateQuiz(
            @Valid @RequestBody QuizGenerateRequest request) {
        return ResponseEntity.ok(quizService.generateQuiz(request));
    }

    @GetMapping
    public ResponseEntity<List<QuizGenerateResponse>> getQuizzes() {
        return ResponseEntity.ok(quizService.getCurrentUserQuizzes());
    }

    /**
     * Reused as the play endpoint. It intentionally omits correct answers and
     * explanations; those are returned only by an attempt result.
     */
    @GetMapping("/{quizId}")
    public ResponseEntity<QuizGenerateResponse> getQuizById(@PathVariable Long quizId) {
        return ResponseEntity.ok(quizService.getQuizById(quizId));
    }

    @GetMapping("/document/{documentId}")
    public ResponseEntity<List<QuizGenerateResponse>> getQuizzesByDocumentId(
            @PathVariable Long documentId) {
        return ResponseEntity.ok(quizService.getQuizzesByDocumentId(documentId));
    }

    @PostMapping("/{quizId}/attempts")
    public ResponseEntity<QuizAttemptResponse> startAttempt(@PathVariable Long quizId) {
        return ResponseEntity.ok(quizAttemptService.startAttempt(quizId));
    }

    @PostMapping("/attempts/{attemptId}/submit")
    public ResponseEntity<QuizAttemptResultResponse> submitAttempt(
            @PathVariable Long attemptId,
            @Valid @RequestBody QuizSubmitRequest request) {
        return ResponseEntity.ok(quizAttemptService.submitAttempt(attemptId, request));
    }

    @GetMapping("/attempts/{attemptId}")
    public ResponseEntity<QuizAttemptResultResponse> getAttemptResult(
            @PathVariable Long attemptId) {
        return ResponseEntity.ok(quizAttemptService.getAttemptResult(attemptId));
    }

    @GetMapping("/{quizId}/attempts")
    public ResponseEntity<List<QuizAttemptResponse>> getAttemptHistory(
            @PathVariable Long quizId) {
        return ResponseEntity.ok(quizAttemptService.getAttemptHistory(quizId));
    }
}
