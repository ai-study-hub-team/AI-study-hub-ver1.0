package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.QuizOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface QuizOptionRepository extends JpaRepository<QuizOption, Long> {

    @Modifying
    @Query("DELETE FROM QuizOption o WHERE o.question.quiz.document.id = :documentId")
    void deleteByDocumentId(@Param("documentId") Long documentId);
}
