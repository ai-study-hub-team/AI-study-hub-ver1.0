package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuizRepository extends JpaRepository<Quiz, Long> {

    List<Quiz> findByUser_IdOrderByCreatedAtDesc(Long userId);

    List<Quiz> findByDocument_IdOrderByCreatedAtDesc(Long documentId);
}
