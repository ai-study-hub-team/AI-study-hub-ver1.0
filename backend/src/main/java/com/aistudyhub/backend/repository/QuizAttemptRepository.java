package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.QuizAttempt;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {

    Optional<QuizAttempt> findByIdAndUser_Id(Long id, Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select attempt from QuizAttempt attempt where attempt.id = :id and attempt.user.id = :userId")
    Optional<QuizAttempt> findOwnedByIdForUpdate(
            @Param("id") Long id,
            @Param("userId") Long userId
    );

    List<QuizAttempt> findByQuiz_IdAndUser_IdOrderByStartedAtDesc(Long quizId, Long userId);
}
