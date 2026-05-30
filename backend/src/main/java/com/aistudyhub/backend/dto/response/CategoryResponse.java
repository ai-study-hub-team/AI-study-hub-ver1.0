package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Response body returned for a Category.
 */
@Getter
@Setter
@Builder
public class CategoryResponse {

    private Long id;
    private String name;
    private String description;
    private Long userId;        // Who owns this category
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
