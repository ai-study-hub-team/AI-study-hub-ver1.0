package com.aistudyhub.backend.dto.python;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PythonTokenUsage {
    private Long promptTokens;
    private Long completionTokens;
    private Long totalTokens;
}
