package com.finops.core.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
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
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF — we're stateless (JWT), not cookie-based.
            .csrf(AbstractHttpConfigurer::disable)
            // Enable CORS so the Vercel-hosted React app can call this API.
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            // Stateless session — no HttpSession, token in every request.
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Auth endpoints are public — anyone can register/login.
                .requestMatchers("/api/auth/**").permitAll()
                // Status transition requires at least OPERATOR or ADMIN role.
                .requestMatchers(HttpMethod.PATCH, "/api/incidents/*/status")
                    .hasAnyRole("OPERATOR", "ADMIN")
                // Everything else just needs a valid JWT (any role).
                .anyRequest().authenticated()
            )
            // Our JWT filter runs before Spring's default username/password filter.
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        // BCrypt with default strength (10 rounds) — appropriate for a demo,
        // and what the schema spec assumes for app_users.password_hash.
        return new BCryptPasswordEncoder();
    }

    /**
     * CORS: allow the Vercel React app origin (and localhost for dev).
     * In production you'd lock this down to the exact Vercel URL.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*")); // tighten in prod
        config.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
