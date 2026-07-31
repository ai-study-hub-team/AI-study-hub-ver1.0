package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.QuizAttemptAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface QuizAttemptAnswerRepository extends JpaRepository<QuizAttemptAnswer, Long> {

    @Modifying
    @Query("DELETE FROM QuizAttemptAnswer a WHERE a.attempt.quiz.document.id = :documentId")
    void deleteByDocumentId(@Param("documentId") Long documentId);
}
