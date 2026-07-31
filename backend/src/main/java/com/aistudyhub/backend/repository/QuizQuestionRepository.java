package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.QuizQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, Long> {

    @Modifying
    @Query("DELETE FROM QuizQuestion q WHERE q.quiz.document.id = :documentId")
    void deleteByDocumentId(@Param("documentId") Long documentId);
}
