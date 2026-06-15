package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.python.*;
import com.aistudyhub.backend.dto.request.QuizGenerateRequest;
import com.aistudyhub.backend.dto.response.QuizGenerateResponse;
import com.aistudyhub.backend.dto.response.QuizOptionResponse;
import com.aistudyhub.backend.dto.response.QuizQuestionResponse;
import com.aistudyhub.backend.entity.*;
import com.aistudyhub.backend.enums.QuizDifficulty;
import com.aistudyhub.backend.enums.QuizType;
import com.aistudyhub.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuizService {

    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final QuizRepository quizRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final QuizOptionRepository quizOptionRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ai.service.base-url}")
    private String aiServiceBaseUrl;

    private static final int DEFAULT_QUESTION_COUNT = 5;
    private static final int MAX_QUESTION_COUNT = 20;

    // ─────────────────────────────────────────────────────────────────────────
    // Generate Quiz
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public QuizGenerateResponse generateQuiz(QuizGenerateRequest request) {
        log.info("Generating quiz for documentId: {}, userId: {}", request.getDocumentId(), request.getUserId());

        // 1. Apply defaults and validate inputs
        int questionCount = request.getQuestionCount() != null ? request.getQuestionCount() : DEFAULT_QUESTION_COUNT;
        if (questionCount < 1) {
            throw new RuntimeException("questionCount must be at least 1");
        }
        if (questionCount > MAX_QUESTION_COUNT) {
            throw new RuntimeException("questionCount must not exceed " + MAX_QUESTION_COUNT);
        }

        QuizDifficulty difficulty = request.getDifficulty() != null ? request.getDifficulty() : QuizDifficulty.MEDIUM;
        QuizType quizType = request.getQuizType() != null ? request.getQuizType() : QuizType.MULTIPLE_CHOICE;

        // 2. Validate User
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found with id: " + request.getUserId()));

        // 3. Validate Document
        Document document = documentRepository.findById(request.getDocumentId())
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + request.getDocumentId()));

        // 4. Verify Ownership
        if (!document.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("User does not have permission to access this document");
        }

        // 5. Verify Document has been processed
        if (document.getProcessStatus() != DocumentProcessStatus.PROCESSED) {
            throw new RuntimeException(
                    "Document has not been successfully processed yet. Current status: " + document.getProcessStatus());
        }

        // 6. Fetch chunks (reuse same method as SummaryService)
        List<DocumentChunk> chunks = documentChunkRepository.findByDocument_IdOrderByChunkIndexAsc(document.getId());
        if (chunks.isEmpty()) {
            throw new RuntimeException("Document has no chunks available for quiz generation");
        }

        // 7. Calculate stats & map to Python DTO
        int totalTextLength = 0;
        List<PythonQuizChunk> pythonChunks = new ArrayList<>();
        for (DocumentChunk chunk : chunks) {
            pythonChunks.add(PythonQuizChunk.builder()
                    .chunkIndex(chunk.getChunkIndex())
                    .chunkText(chunk.getChunkText())
                    .textLength(chunk.getTextLength())
                    .build());
            totalTextLength += chunk.getTextLength() != null ? chunk.getTextLength() : 0;
        }

        // 8. Build Python request
        PythonQuizRequest pythonRequest = PythonQuizRequest.builder()
                .documentId(document.getId())
                .documentTitle(document.getTitle())
                .questionCount(questionCount)
                .difficulty(difficulty)
                .quizType(quizType)
                .totalChunks(chunks.size())
                .totalTextLength(totalTextLength)
                .chunks(pythonChunks)
                .build();

        // 9. Call Python AI Service
        String url = aiServiceBaseUrl + "/quiz";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<PythonQuizRequest> entity = new HttpEntity<>(pythonRequest, headers);

        PythonQuizResponse pythonResponse;
        try {
            ResponseEntity<PythonQuizResponse> responseEntity =
                    restTemplate.postForEntity(url, entity, PythonQuizResponse.class);
            if (!responseEntity.getStatusCode().is2xxSuccessful() || responseEntity.getBody() == null) {
                throw new RuntimeException("AI service returned an invalid response");
            }
            pythonResponse = responseEntity.getBody();
        } catch (Exception e) {
            log.error("Failed to call AI service for quiz: ", e);
            throw new RuntimeException("Failed to generate quiz from AI service: " + e.getMessage());
        }

        // 10. Validate Python response
        if (pythonResponse.getQuestions() == null || pythonResponse.getQuestions().isEmpty()) {
            throw new RuntimeException("AI service returned empty questions list");
        }

        // Trim if Python returned more than requested
        List<PythonQuizQuestion> receivedQuestions = pythonResponse.getQuestions();
        if (receivedQuestions.size() > questionCount) {
            log.warn("Python returned {} questions but {} were requested — trimming.", receivedQuestions.size(), questionCount);
            receivedQuestions = receivedQuestions.subList(0, questionCount);
        }

        for (int i = 0; i < receivedQuestions.size(); i++) {
            PythonQuizQuestion q = receivedQuestions.get(i);
            if (q.getOptions() == null || q.getOptions().size() != 4) {
                throw new RuntimeException(
                        "Question " + (i + 1) + " does not have exactly 4 options. Got: " +
                        (q.getOptions() != null ? q.getOptions().size() : "null"));
            }
            long correctCount = q.getOptions().stream()
                    .filter(o -> Boolean.TRUE.equals(o.getIsCorrect())).count();
            if (correctCount != 1) {
                throw new RuntimeException(
                        "Question " + (i + 1) + " must have exactly 1 correct answer. Got: " + correctCount);
            }
        }

        // 11. Persist Quiz → QuizQuestion → QuizOption
        String quizTitle = (pythonResponse.getTitle() != null && !pythonResponse.getTitle().isBlank())
                ? pythonResponse.getTitle()
                : "Quiz: " + document.getTitle();

        Quiz quiz = Quiz.builder()
                .document(document)
                .user(user)
                .title(quizTitle)
                .difficulty(difficulty)
                .quizType(quizType)
                .questionCount(receivedQuestions.size())
                .build();

        quiz = quizRepository.save(quiz);

        List<QuizQuestion> savedQuestions = new ArrayList<>();
        for (int i = 0; i < receivedQuestions.size(); i++) {
            PythonQuizQuestion pyQ = receivedQuestions.get(i);

            QuizQuestion question = QuizQuestion.builder()
                    .quiz(quiz)
                    .questionText(pyQ.getQuestionText())
                    .questionOrder(i + 1)
                    .explanation(pyQ.getExplanation())
                    .build();

            question = quizQuestionRepository.save(question);

            List<QuizOption> savedOptions = new ArrayList<>();
            List<PythonQuizOption> pyOptions = pyQ.getOptions();
            for (int j = 0; j < pyOptions.size(); j++) {
                PythonQuizOption pyOpt = pyOptions.get(j);
                QuizOption option = QuizOption.builder()
                        .question(question)
                        .optionText(pyOpt.getOptionText())
                        .isCorrect(Boolean.TRUE.equals(pyOpt.getIsCorrect()))
                        .optionOrder(j + 1)
                        .build();
                savedOptions.add(quizOptionRepository.save(option));
            }
            question.setOptions(savedOptions);
            savedQuestions.add(question);
        }

        quiz.setQuestions(savedQuestions);

        log.info("Quiz saved successfully. quizId: {}, questionCount: {}", quiz.getId(), savedQuestions.size());
        return mapToResponse(quiz);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // History Queries
    // ─────────────────────────────────────────────────────────────────────────

    public List<QuizGenerateResponse> getQuizzesByUserId(Long userId) {
        List<Quiz> quizzes = quizRepository.findByUser_IdOrderByCreatedAtDesc(userId);
        return quizzes.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public QuizGenerateResponse getQuizById(Long quizId, Long userId) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new RuntimeException("Quiz not found with id: " + quizId));

        if (!quiz.getUser().getId().equals(userId)) {
            throw new RuntimeException("User does not have permission to access this quiz");
        }
        return mapToResponse(quiz);
    }

    public List<QuizGenerateResponse> getQuizzesByDocumentId(Long documentId, Long userId) {
        // Verify document belongs to the user before returning quizzes
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + documentId));

        if (!document.getUser().getId().equals(userId)) {
            throw new RuntimeException("User does not have permission to access this document");
        }

        List<Quiz> quizzes = quizRepository.findByDocument_IdOrderByCreatedAtDesc(documentId);
        return quizzes.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Mapper
    // ─────────────────────────────────────────────────────────────────────────

    private QuizGenerateResponse mapToResponse(Quiz quiz) {
        List<QuizQuestionResponse> questionResponses = quiz.getQuestions().stream()
                .map(q -> QuizQuestionResponse.builder()
                        .questionId(q.getId())
                        .questionText(q.getQuestionText())
                        .questionOrder(q.getQuestionOrder())
                        .explanation(q.getExplanation())
                        .options(q.getOptions().stream()
                                .map(o -> QuizOptionResponse.builder()
                                        .optionId(o.getId())
                                        .optionText(o.getOptionText())
                                        .isCorrect(o.getIsCorrect())
                                        .optionOrder(o.getOptionOrder())
                                        .build())
                                .collect(Collectors.toList()))
                        .build())
                .collect(Collectors.toList());

        return QuizGenerateResponse.builder()
                .quizId(quiz.getId())
                .documentId(quiz.getDocument().getId())
                .documentTitle(quiz.getDocument().getTitle())
                .title(quiz.getTitle())
                .difficulty(quiz.getDifficulty())
                .quizType(quiz.getQuizType())
                .questionCount(quiz.getQuestionCount())
                .questions(questionResponses)
                .createdAt(quiz.getCreatedAt())
                .build();
    }
}
