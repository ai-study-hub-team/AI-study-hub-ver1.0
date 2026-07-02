package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
public class ShareResultResponse {
    private String message;
    private List<String> sharedEmails;
    private List<String> alreadySharedEmails;
    private List<String> notFoundEmails;
}
