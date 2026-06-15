package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.QuizGenerateRequest;
import com.aistudyhub.backend.dto.response.QuizGenerateResponse;
import com.aistudyhub.backend.service.QuizService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/quizzes")
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;

    /** Generate a new quiz from a document. */
    @PostMapping("/generate")
    public ResponseEntity<QuizGenerateResponse> generateQuiz(@Valid @RequestBody QuizGenerateRequest request) {
        QuizGenerateResponse response = quizService.generateQuiz(request);
        return ResponseEntity.ok(response);
    }

    /** Get all quizzes for a user (newest first). */
    @GetMapping
    public ResponseEntity<List<QuizGenerateResponse>> getQuizzesByUserId(@RequestParam Long userId) {
        List<QuizGenerateResponse> responses = quizService.getQuizzesByUserId(userId);
        return ResponseEntity.ok(responses);
    }

    /** Get a single quiz by ID — validates ownership before returning. */
    @GetMapping("/{quizId}")
    public ResponseEntity<QuizGenerateResponse> getQuizById(
            @PathVariable Long quizId,
            @RequestParam Long userId) {
        QuizGenerateResponse response = quizService.getQuizById(quizId, userId);
        return ResponseEntity.ok(response);
    }

    /** Get all quizzes for a document — validates document ownership first. */
    @GetMapping("/document/{documentId}")
    public ResponseEntity<List<QuizGenerateResponse>> getQuizzesByDocumentId(
            @PathVariable Long documentId,
            @RequestParam Long userId) {
        List<QuizGenerateResponse> responses = quizService.getQuizzesByDocumentId(documentId, userId);
        return ResponseEntity.ok(responses);
    }
}
