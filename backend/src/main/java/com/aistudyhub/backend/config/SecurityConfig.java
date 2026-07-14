package com.aistudyhub.backend.config;

import com.aistudyhub.backend.security.JwtAuthenticationFilter;
import com.aistudyhub.backend.security.RestAccessDeniedHandler;
import com.aistudyhub.backend.security.RestAuthenticationEntryPoint;
import com.aistudyhub.backend.security.UserActivityTrackingFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
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

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

        private final JwtAuthenticationFilter jwtAuthenticationFilter;
        private final RestAuthenticationEntryPoint authenticationEntryPoint;
        private final RestAccessDeniedHandler accessDeniedHandler;
        private final UserActivityTrackingFilter userActivityTrackingFilter;

        /**
         * Có thể truyền nhiều origin, cách nhau bằng dấu phẩy.
         *
         * Ví dụ:
         * http://localhost:5173,https://your-app.vercel.app
         */
        @Value("${app.cors.allowed-origins:http://localhost:5173}")
        private String allowedOriginsProperty;

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

                                .sessionManagement(session -> session.sessionCreationPolicy(
                                                SessionCreationPolicy.STATELESS))

                                .formLogin(AbstractHttpConfigurer::disable)
                                .httpBasic(AbstractHttpConfigurer::disable)

                                .exceptionHandling(exception -> exception
                                                .authenticationEntryPoint(authenticationEntryPoint)
                                                .accessDeniedHandler(accessDeniedHandler))

                                .authorizeHttpRequests(auth -> auth

                                                // Cho phép CORS preflight request
                                                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                                                // Cho phép Spring xử lý error response
                                                .requestMatchers("/error").permitAll()

                                                .requestMatchers(
                                                                "/api/auth/register",
                                                                "/api/auth/login",
                                                                "/api/auth/google",
                                                                "/api/auth/refresh",
                                                                "/api/auth/forgot-password",
                                                                "/api/auth/reset-password",
                                                                "/api/auth/verify-email",
                                                                "/api/auth/resend-verification",
                                                                "/api/payments/vnpay-return",
                                                                "/swagger-ui/**",
                                                                "/swagger-ui.html",
                                                                "/v3/api-docs/**",
                                                                "/api/public/**")
                                                .permitAll()

                                                .requestMatchers(
                                                                HttpMethod.GET,
                                                                "/api/plans")
                                                .permitAll()

                                                .requestMatchers(
                                                                "/api/admin/managers/**",
                                                                "/api/admin/plans/**")
                                                .hasRole("ADMIN")

                                                .requestMatchers(
                                                                HttpMethod.GET,
                                                                "/api/admin/dashboard/revenue")
                                                .hasRole("ADMIN")

                                                .requestMatchers(
                                                                HttpMethod.PATCH,
                                                                "/api/users/*/subscription")
                                                .hasRole("ADMIN")

                                                .requestMatchers("/api/admin/**")
                                                .hasAnyRole("ADMIN", "MANAGER")

                                                .requestMatchers("/api/users/**")
                                                .hasAnyRole("ADMIN", "MANAGER")

                                                .requestMatchers("/api/internal/**").denyAll()

                                                .anyRequest().authenticated())

                                .addFilterBefore(
                                                jwtAuthenticationFilter,
                                                UsernamePasswordAuthenticationFilter.class)

                                .addFilterAfter(
                                                userActivityTrackingFilter,
                                                JwtAuthenticationFilter.class);

                return http.build();
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration = new CorsConfiguration();

                List<String> allowedOrigins = Arrays.stream(
                                allowedOriginsProperty.split(","))
                                .map(String::trim)
                                .filter(origin -> !origin.isBlank())
                                .toList();

                configuration.setAllowedOrigins(allowedOrigins);

                configuration.setAllowedMethods(List.of(
                                "GET",
                                "POST",
                                "PUT",
                                "PATCH",
                                "DELETE",
                                "OPTIONS"));

                configuration.setAllowedHeaders(List.of(
                                "Authorization",
                                "Content-Type",
                                "Accept",
                                "Origin",
                                "X-Requested-With"));

                configuration.setExposedHeaders(List.of(
                                "Authorization"));

                configuration.setAllowCredentials(true);
                configuration.setMaxAge(3600L);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

                source.registerCorsConfiguration("/**", configuration);

                return source;
        }
}