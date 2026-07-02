package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
public class ShareDocumentResponse {
    private String message;
    private List<String> sharedEmails;
    private List<String> notRegisteredEmails;
    private List<String> alreadySharedEmails;
}
