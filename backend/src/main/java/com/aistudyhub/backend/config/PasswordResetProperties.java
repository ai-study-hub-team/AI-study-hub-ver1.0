package com.aistudyhub.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "password-reset")
public class PasswordResetProperties {
    private long tokenExpirationMinutes = 15;
    private long resendCooldownSeconds = 60;
}