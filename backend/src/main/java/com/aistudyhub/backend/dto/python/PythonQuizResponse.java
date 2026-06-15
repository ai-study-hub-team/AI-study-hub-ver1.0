package com.aistudyhub.backend.dto.python;

import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PythonQuizResponse {
    private String title;
    private List<PythonQuizQuestion> questions;
}
