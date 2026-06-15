package com.aistudyhub.backend.dto.python;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PythonQuizChunk {
    private Integer chunkIndex;
    private String chunkText;
    private Integer textLength;
}
