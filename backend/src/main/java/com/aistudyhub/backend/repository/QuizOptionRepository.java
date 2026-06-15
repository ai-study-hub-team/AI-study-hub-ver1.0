package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.QuizOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QuizOptionRepository extends JpaRepository<QuizOption, Long> {
}
