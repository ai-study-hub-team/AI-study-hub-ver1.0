package com.aistudyhub.backend.security;

import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.service.CurrentUserService;
import com.aistudyhub.backend.service.UserActivityLogService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class UserActivityTrackingFilter extends OncePerRequestFilter {

    private final CurrentUserService currentUserService;
    private final UserActivityLogService userActivityLogService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        filterChain.doFilter(request, response);

        if (shouldSkip(request, response)) {
            return;
        }

        Optional<User> currentUser = currentUserService.getCurrentUserOptional();
        currentUser.ifPresent(user -> userActivityLogService.record(
                user,
                buildAction(request),
                resolveTargetType(request),
                resolveTargetId(request),
                request.getRemoteAddr(),
                request.getHeader("User-Agent")
        ));
    }

    private boolean shouldSkip(HttpServletRequest request, HttpServletResponse response) {
        String path = request.getRequestURI();
        return path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs")
                || path.startsWith("/api/public/")
                || path.startsWith("/api/auth/refresh")
                || path.startsWith("/api/notifications/unread-count")
                || response.getStatus() >= 400;
    }

    private String buildAction(HttpServletRequest request) {
        return request.getMethod() + " " + request.getRequestURI();
    }

    private String resolveTargetType(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path.contains("/documents")) return "DOCUMENT";
        if (path.contains("/folders")) return "FOLDER";
        if (path.contains("/payments")) return "PAYMENT";
        if (path.contains("/chat")) return "CHAT";
        if (path.contains("/reports")) return "REPORT";
        return "API";
    }

    private Long resolveTargetId(HttpServletRequest request) {
        String[] parts = request.getRequestURI().split("/");
        for (String part : parts) {
            try {
                return Long.parseLong(part);
            } catch (NumberFormatException ignored) {
                // ignore non-numeric path segment
            }
        }
        return null;
    }
}