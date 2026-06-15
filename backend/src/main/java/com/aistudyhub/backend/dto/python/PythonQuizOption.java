package com.aistudyhub.backend.dto.python;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PythonQuizOption {
    private String optionText;
    private Boolean isCorrect;
}
