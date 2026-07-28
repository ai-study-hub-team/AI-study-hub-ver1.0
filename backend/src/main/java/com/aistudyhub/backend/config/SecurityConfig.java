package com.aistudyhub.backend.config;

import com.aistudyhub.backend.security.JwtAuthenticationFilter;
import com.aistudyhub.backend.security.RestAccessDeniedHandler;
import com.aistudyhub.backend.security.RestAuthenticationEntryPoint;
import com.aistudyhub.backend.security.UserActivityTrackingFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RestAuthenticationEntryPoint authenticationEntryPoint;
    private final RestAccessDeniedHandler accessDeniedHandler;
    private final UserActivityTrackingFilter userActivityTrackingFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {

        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler)
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/auth/register",
                                "/api/auth/login",
                                "/api/auth/google",
                                "/api/auth/refresh",
                                "/api/auth/forgot-password",
                                "/api/auth/reset-password",
                                "/api/auth/verify-email",
                                "/api/auth/resend-verification",
                                "/api/payments/vnpay-return"
                        ).permitAll()

                        // Swagger / OpenAPI documentation
                        .requestMatchers(
                                "/swagger-ui.html",
                                "/swagger-ui/**",
                                "/v3/api-docs/**",
                                "/v3/api-docs.yaml"
                        ).permitAll()

                        // Public plan listing
                        .requestMatchers(HttpMethod.GET, "/api/plans").permitAll()

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/public/avatars/*"

                        ).permitAll()
                        // Public document preview links
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/public/documents/*",
                                "/api/public/documents/*/file",
                                "/api/public/documents/*/download"
                        ).permitAll()

                        // Public share-link information only
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/public/document-share-links/*"
                        ).permitAll()

                        // Block the old anonymous shared-upload endpoint
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/public/document-share-links/**"
                        ).denyAll()

                        // Block every other public API unless explicitly allowed above
                        .requestMatchers("/api/public/**").denyAll()

                        // Admin-only manager and plan management
                        .requestMatchers("/api/admin/managers/**").hasRole("ADMIN")
                        .requestMatchers("/api/admin/plans/**").hasRole("ADMIN")

                        // Admin-only revenue dashboard
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/admin/dashboard/revenue"
                        ).hasRole("ADMIN")

                        // Admin-only subscription modification
                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/users/*/subscription"
                        ).hasRole("ADMIN")

                        // Remaining admin and user-management endpoints
                        .requestMatchers("/api/admin/**")
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers("/api/users/**")
                        .hasAnyRole("ADMIN", "MANAGER")

                        // Internal APIs must never be exposed
                        .requestMatchers("/api/internal/**").denyAll()

                        // All remaining endpoints require JWT authentication
                        .anyRequest().authenticated()
                )
                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                )
                .addFilterAfter(
                        userActivityTrackingFilter,
                        JwtAuthenticationFilter.class
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOrigins(List.of("http://localhost:5173"));
        configuration.setAllowedMethods(List.of(
                "GET",
                "POST",
                "PUT",
                "PATCH",
                "DELETE",
                "OPTIONS"
        ));
        configuration.setAllowedHeaders(List.of(
                "Authorization",
                "Content-Type"
        ));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}
