package com.aistudyhub.backend.security;

import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.enums.UserStatus;
import com.aistudyhub.backend.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final AuthenticationEntryPoint authenticationEntryPoint;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String path = request.getRequestURI();
        if (path.startsWith("/api/public/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String header = request.getHeader("Authorization");

        log.debug("Authorization header present: {}", header != null);
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(7).trim();

        // Tolerate double 'Bearer ' prefix (common mistake when pasting into Swagger UI)
        if (token.toLowerCase().startsWith("bearer ")) {
            token = token.substring(7).trim();
            log.debug("Stripped extra Bearer prefix from token");
        }

        log.debug("Extracted token length: {}", token.length());

        boolean isValid = false;
        try {
            isValid = jwtService.validateAccessToken(token);
        } catch (Exception e) {
            log.debug("Token validation threw exception: {}", e.getMessage());
        }

        log.debug("Token validation result: {}", isValid);
        if (token.isEmpty() || !isValid) {
            authenticationEntryPoint.commence(
                    request,
                    response,
                    new InsufficientAuthenticationException("Invalid or expired access token")
            );
            return;
        }

        String email = jwtService.extractEmail(token);
        log.debug("Extracted email from token: {}", email);
        
        User user = userRepository.findByEmail(email).orElse(null);
        log.debug("User loaded from DB: {}", user != null);

        if (user == null || user.getStatus() != UserStatus.ACTIVE) {
            authenticationEntryPoint.commence(
                    request,
                    response,
                    new InsufficientAuthenticationException("User not found or inactive")
            );
            return;
        }

        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            SimpleGrantedAuthority authority =
                    new SimpleGrantedAuthority(
                            "ROLE_" + user.getRole().name()
                    );

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            user.getEmail(),
                            null,
                            List.of(authority)
                    );

            authentication.setDetails(user.getId());
            SecurityContextHolder
                    .getContext()
                    .setAuthentication(authentication);
            log.debug("Authentication set in SecurityContextHolder for email: {}", email);
        }

        filterChain.doFilter(request, response);

    }
}
