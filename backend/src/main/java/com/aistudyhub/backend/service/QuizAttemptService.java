package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.request.QuizAnswerRequest;
import com.aistudyhub.backend.dto.request.QuizSubmitRequest;
import com.aistudyhub.backend.dto.response.QuizAnswerResultResponse;
import com.aistudyhub.backend.dto.response.QuizAttemptResponse;
import com.aistudyhub.backend.dto.response.QuizAttemptResultResponse;
import com.aistudyhub.backend.entity.*;
import com.aistudyhub.backend.enums.QuizAttemptStatus;
import com.aistudyhub.backend.exception.BadRequestException;
import com.aistudyhub.backend.exception.NotFoundException;
import com.aistudyhub.backend.repository.QuizAttemptAnswerRepository;
import com.aistudyhub.backend.repository.QuizAttemptRepository;
import com.aistudyhub.backend.repository.QuizRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuizAttemptService {

    private final QuizRepository quizRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizAttemptAnswerRepository quizAttemptAnswerRepository;
    private final CurrentUserService currentUserService;

    @Transactional
    public QuizAttemptResponse startAttempt(Long quizId) {
        User currentUser = currentUserService.getCurrentUser();
        Quiz quiz = getOwnedQuiz(quizId, currentUser.getId());

        QuizAttempt attempt = QuizAttempt.builder()
                .quiz(quiz)
                .user(currentUser)
                .status(QuizAttemptStatus.IN_PROGRESS)
                .startedAt(LocalDateTime.now())
                .build();

        return toSummary(quizAttemptRepository.save(attempt));
    }

    @Transactional
    public QuizAttemptResultResponse submitAttempt(Long attemptId, QuizSubmitRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        QuizAttempt attempt = quizAttemptRepository
                .findOwnedByIdForUpdate(attemptId, currentUser.getId())
                .orElseThrow(() -> new NotFoundException("Quiz attempt not found"));

        if (attempt.getStatus() != QuizAttemptStatus.IN_PROGRESS) {
            throw new BadRequestException("This quiz attempt has already been submitted");
        }

        Quiz quiz = attempt.getQuiz();
        Map<Long, QuizQuestion> questionsById = quiz.getQuestions().stream()
                .collect(Collectors.toMap(QuizQuestion::getId, Function.identity()));

        List<QuizAnswerRequest> submittedAnswers =
                request.getAnswers() == null ? List.of() : request.getAnswers();
        Set<Long> seenQuestionIds = new HashSet<>();
        int correctCount = 0;

        for (QuizAnswerRequest submitted : submittedAnswers) {
            if (!seenQuestionIds.add(submitted.getQuestionId())) {
                throw new BadRequestException(
                        "A question can only be answered once: " + submitted.getQuestionId());
            }

            QuizQuestion question = questionsById.get(submitted.getQuestionId());
            if (question == null) {
                throw new BadRequestException(
                        "Question does not belong to this quiz: " + submitted.getQuestionId());
            }

            QuizOption selectedOption = question.getOptions().stream()
                    .filter(option -> option.getId().equals(submitted.getSelectedOptionId()))
                    .findFirst()
                    .orElseThrow(() -> new BadRequestException(
                            "Selected option does not belong to question "
                                    + submitted.getQuestionId()));

            boolean correct = Boolean.TRUE.equals(selectedOption.getIsCorrect());
            if (correct) {
                correctCount++;
            }

            QuizAttemptAnswer answer = QuizAttemptAnswer.builder()
                    .attempt(attempt)
                    .question(question)
                    .selectedOption(selectedOption)
                    .isCorrect(correct)
                    .build();
            QuizAttemptAnswer savedAnswer = quizAttemptAnswerRepository.save(answer);
            attempt.getAnswers().add(savedAnswer);
        }

        int totalQuestions = quiz.getQuestions().size();
        BigDecimal score = totalQuestions == 0
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(correctCount)
                        .multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(totalQuestions), 2, RoundingMode.HALF_UP);

        attempt.setCorrectCount(correctCount);
        attempt.setTotalQuestions(totalQuestions);
        attempt.setScore(score);
        attempt.setSubmittedAt(LocalDateTime.now());
        attempt.setStatus(QuizAttemptStatus.SUBMITTED);
        QuizAttempt savedAttempt = quizAttemptRepository.save(attempt);

        return toResult(savedAttempt);
    }

    @Transactional(readOnly = true)
    public QuizAttemptResultResponse getAttemptResult(Long attemptId) {
        User currentUser = currentUserService.getCurrentUser();
        QuizAttempt attempt = quizAttemptRepository
                .findByIdAndUser_Id(attemptId, currentUser.getId())
                .orElseThrow(() -> new NotFoundException("Quiz attempt not found"));

        if (attempt.getStatus() != QuizAttemptStatus.SUBMITTED) {
            throw new BadRequestException("Quiz attempt has not been submitted");
        }

        return toResult(attempt);
    }

    @Transactional(readOnly = true)
    public List<QuizAttemptResponse> getAttemptHistory(Long quizId) {
        User currentUser = currentUserService.getCurrentUser();
        getOwnedQuiz(quizId, currentUser.getId());

        return quizAttemptRepository
                .findByQuiz_IdAndUser_IdOrderByStartedAtDesc(quizId, currentUser.getId())
                .stream()
                .map(this::toSummary)
                .toList();
    }

    private Quiz getOwnedQuiz(Long quizId, Long userId) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new NotFoundException("Quiz not found with id: " + quizId));
        if (!quiz.getUser().getId().equals(userId)) {
            // Do not disclose another user's quiz existence.
            throw new NotFoundException("Quiz not found with id: " + quizId);
        }
        return quiz;
    }

    private QuizAttemptResponse toSummary(QuizAttempt attempt) {
        return QuizAttemptResponse.builder()
                .attemptId(attempt.getId())
                .quizId(attempt.getQuiz().getId())
                .status(attempt.getStatus())
                .correctCount(attempt.getCorrectCount())
                .totalQuestions(attempt.getTotalQuestions())
                .score(attempt.getScore())
                .startedAt(attempt.getStartedAt())
                .submittedAt(attempt.getSubmittedAt())
                .build();
    }

    private QuizAttemptResultResponse toResult(QuizAttempt attempt) {
        List<QuizAnswerResultResponse> answers = attempt.getAnswers().stream()
                .map(answer -> QuizAnswerResultResponse.builder()
                        .questionId(answer.getQuestion().getId())
                        .selectedOptionId(answer.getSelectedOption().getId())
                        .correctOptionId(findCorrectOptionId(answer.getQuestion()))
                        .correct(answer.getIsCorrect())
                        .explanation(answer.getQuestion().getExplanation())
                        .build())
                .toList();

        return QuizAttemptResultResponse.builder()
                .attemptId(attempt.getId())
                .quizId(attempt.getQuiz().getId())
                .status(attempt.getStatus())
                .correctCount(attempt.getCorrectCount())
                .totalQuestions(attempt.getTotalQuestions())
                .score(attempt.getScore())
                .startedAt(attempt.getStartedAt())
                .submittedAt(attempt.getSubmittedAt())
                .answers(answers)
                .build();
    }

    private Long findCorrectOptionId(QuizQuestion question) {
        return question.getOptions().stream()
                .filter(option -> Boolean.TRUE.equals(option.getIsCorrect()))
                .map(QuizOption::getId)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "Question has no correct option: " + question.getId()));
    }
}
