package com.aistudyhub.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "email-verification")
public class EmailVerificationProperties {
    private long tokenExpirationMinutes = 1440;
    private long resendCooldownSeconds = 60;
}
