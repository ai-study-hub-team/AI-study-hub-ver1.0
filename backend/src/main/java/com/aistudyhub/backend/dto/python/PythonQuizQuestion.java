package com.aistudyhub.backend.dto.python;

import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PythonQuizQuestion {
    private String questionText;
    private String explanation;
    private List<PythonQuizOption> options;
}
