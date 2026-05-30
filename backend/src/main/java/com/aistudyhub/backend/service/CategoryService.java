package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.request.CategoryRequest;
import com.aistudyhub.backend.dto.response.CategoryResponse;
import com.aistudyhub.backend.entity.Category;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.repository.CategoryRepository;
import com.aistudyhub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    // ─── Create ────────────────────────────────────────────────────────────────

    public CategoryResponse create(CategoryRequest request) {
        // 1. Find the user — throw if not found
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found with id: " + request.getUserId()));

        // 2. Build and save the Category entity
        Category category = Category.builder()
                .name(request.getName())
                .description(request.getDescription())
                .user(user)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Category saved = categoryRepository.save(category);
        return toResponse(saved);
    }

    // ─── Read All ──────────────────────────────────────────────────────────────

    public List<CategoryResponse> getAll() {
        return categoryRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─── Read One ──────────────────────────────────────────────────────────────

    public CategoryResponse getById(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + id));
        return toResponse(category);
    }

    // ─── Update ────────────────────────────────────────────────────────────────

    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + id));

        // Update only provided fields
        category.setName(request.getName());
        category.setDescription(request.getDescription());
        category.setUpdatedAt(LocalDateTime.now());

        // Optionally re-assign user
        if (request.getUserId() != null) {
            User user = userRepository.findById(request.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found with id: " + request.getUserId()));
            category.setUser(user);
        }

        return toResponse(categoryRepository.save(category));
    }

    // ─── Delete ────────────────────────────────────────────────────────────────

    public void delete(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + id));
        categoryRepository.delete(category);
    }

    // ─── Mapper ────────────────────────────────────────────────────────────────

    private CategoryResponse toResponse(Category category) {
        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .userId(category.getUser() != null ? category.getUser().getId() : null)
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .build();
    }
}
