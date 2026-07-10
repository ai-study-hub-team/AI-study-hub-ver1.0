package com.aistudyhub.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * Request body for creating or updating a Category.
 */
@Getter
@Setter
public class CategoryRequest {
    @NotBlank(message = "Category name must not be blank")
    private String name;

    private String description;

}
