package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.request.CategoryRequest;
import com.aistudyhub.backend.dto.response.CategoryResponse;
import com.aistudyhub.backend.entity.Category;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.exception.NotFoundException;
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
    private final CurrentUserService currentUserService;

    // ─── Create ────────────────────────────────────────────────────────────────

    public CategoryResponse create(CategoryRequest request) {
        User user = currentUserService.getCurrentUser();

        Category category = Category.builder()
                .name(request.getName().trim())
                .description(request.getDescription())
                .user(user)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return toResponse(categoryRepository.save(category));
    }


    // ─── Read All ──────────────────────────────────────────────────────────────

    public List<CategoryResponse> getAll() {
        User user = currentUserService.getCurrentUser();

        return categoryRepository.findByUserId(user.getId())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─── Read One ──────────────────────────────────────────────────────────────

    public CategoryResponse getById(Long id) {
        return toResponse(getOwnedCategory(id));
    }

    // ─── Update ────────────────────────────────────────────────────────────────

    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = getOwnedCategory(id);

        category.setName(request.getName().trim());
        category.setDescription(request.getDescription());
        category.setUpdatedAt(LocalDateTime.now());

        return toResponse(categoryRepository.save(category));
    }

    // ─── Delete ────────────────────────────────────────────────────────────────

    public void delete(Long id) {
        categoryRepository.delete(getOwnedCategory(id));
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

    private Category getOwnedCategory(Long id) {
        User user = currentUserService.getCurrentUser();

        return categoryRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new NotFoundException("Category not found"));
    }
}
