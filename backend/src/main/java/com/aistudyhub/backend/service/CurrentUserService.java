package com.aistudyhub.backend.service;

import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.exception.UnauthorizedException;
import com.aistudyhub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CurrentUserService {

    private final UserRepository userRepository;

    public User getCurrentUser() {
        return getCurrentUserOptional()
                .orElseThrow(() -> new UnauthorizedException("Authentication is required"));
    }

    public Optional<User> getCurrentUserOptional() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return Optional.empty();
        }

        String email = authentication.getName();
        if (email == null || email.isBlank()) {
            return Optional.empty();
        }

        return userRepository.findByEmail(email);
    }
}

