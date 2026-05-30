package com.aistudyhub.backend.repository;

import com.aistudyhub.backend.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    // Find all categories belonging to a specific user
    List<Category> findByUserId(Long userId);
}
