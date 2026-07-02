package com.aistudyhub.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "resend")
public class ResendProperties {
    private String apiKey;
    private String fromEmail;
    private String frontendUrl;
}
