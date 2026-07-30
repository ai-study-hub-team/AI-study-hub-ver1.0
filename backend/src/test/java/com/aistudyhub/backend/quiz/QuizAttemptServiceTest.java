package com.aistudyhub.backend.quiz;

import com.aistudyhub.backend.dto.request.QuizAnswerRequest;
import com.aistudyhub.backend.dto.request.QuizSubmitRequest;
import com.aistudyhub.backend.dto.response.QuizAttemptResultResponse;
import com.aistudyhub.backend.entity.*;
import com.aistudyhub.backend.enums.QuizAttemptStatus;
import com.aistudyhub.backend.exception.BadRequestException;
import com.aistudyhub.backend.repository.QuizAttemptAnswerRepository;
import com.aistudyhub.backend.repository.QuizAttemptRepository;
import com.aistudyhub.backend.repository.QuizRepository;
import com.aistudyhub.backend.service.CurrentUserService;
import com.aistudyhub.backend.service.QuizAttemptService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QuizAttemptServiceTest {

    @Mock QuizRepository quizRepository;
    @Mock QuizAttemptRepository attemptRepository;
    @Mock QuizAttemptAnswerRepository answerRepository;
    @Mock CurrentUserService currentUserService;

    private QuizAttemptService service;
    private User user;
    private Quiz quiz;
    private QuizAttempt attempt;

    @BeforeEach
    void setUp() {
        service = new QuizAttemptService(
                quizRepository,
                attemptRepository,
                answerRepository,
                currentUserService
        );

        user = User.builder().id(10L).email("user@example.com").build();

        QuizQuestion firstQuestion = question(201L, 301L, 302L);
        QuizQuestion secondQuestion = question(202L, 303L, 304L);
        quiz = Quiz.builder()
                .id(101L)
                .user(user)
                .questions(new ArrayList<>(List.of(firstQuestion, secondQuestion)))
                .build();
        firstQuestion.setQuiz(quiz);
        secondQuestion.setQuiz(quiz);

        attempt = QuizAttempt.builder()
                .id(501L)
                .quiz(quiz)
                .user(user)
                .status(QuizAttemptStatus.IN_PROGRESS)
                .answers(new ArrayList<>())
                .build();
    }

    @Test
    void submitScoresOnBackendAndReturnsCorrectAnswersAfterSubmission() {
        when(currentUserService.getCurrentUser()).thenReturn(user);
        when(attemptRepository.findOwnedByIdForUpdate(501L, 10L))
                .thenReturn(Optional.of(attempt));
        when(answerRepository.save(any(QuizAttemptAnswer.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(attemptRepository.save(attempt)).thenReturn(attempt);

        QuizSubmitRequest request = request(
                answer(201L, 301L),
                answer(202L, 304L)
        );

        QuizAttemptResultResponse response = service.submitAttempt(501L, request);

        assertThat(response.getStatus()).isEqualTo(QuizAttemptStatus.SUBMITTED);
        assertThat(response.getCorrectCount()).isEqualTo(1);
        assertThat(response.getTotalQuestions()).isEqualTo(2);
        assertThat(response.getScore()).isEqualByComparingTo("50.00");
        assertThat(response.getAnswers()).hasSize(2);
        assertThat(response.getAnswers().get(0).getCorrectOptionId()).isEqualTo(301L);
        assertThat(response.getAnswers().get(1).getCorrectOptionId()).isEqualTo(303L);
    }

    @Test
    void submitRejectsOptionFromAnotherQuestion() {
        when(currentUserService.getCurrentUser()).thenReturn(user);
        when(attemptRepository.findOwnedByIdForUpdate(501L, 10L))
                .thenReturn(Optional.of(attempt));

        QuizSubmitRequest request = request(answer(201L, 303L));

        assertThatThrownBy(() -> service.submitAttempt(501L, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("does not belong");
    }

    private QuizQuestion question(Long questionId, Long correctId, Long wrongId) {
        QuizQuestion question = QuizQuestion.builder()
                .id(questionId)
                .questionText("Question " + questionId)
                .explanation("Explanation " + questionId)
                .options(new ArrayList<>())
                .build();
        QuizOption correct = QuizOption.builder()
                .id(correctId)
                .question(question)
                .isCorrect(true)
                .build();
        QuizOption wrong = QuizOption.builder()
                .id(wrongId)
                .question(question)
                .isCorrect(false)
                .build();
        question.getOptions().addAll(List.of(correct, wrong));
        return question;
    }

    private QuizSubmitRequest request(QuizAnswerRequest... answers) {
        QuizSubmitRequest request = new QuizSubmitRequest();
        request.setAnswers(List.of(answers));
        return request;
    }

    private QuizAnswerRequest answer(Long questionId, Long optionId) {
        QuizAnswerRequest answer = new QuizAnswerRequest();
        answer.setQuestionId(questionId);
        answer.setSelectedOptionId(optionId);
        return answer;
    }
}
