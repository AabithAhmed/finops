package com.finops.core.controller;

import com.finops.core.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * POST /api/auth/register
     * Body: {"email": "...", "password": "..."}
     * Returns: {"token": "...", "role": "viewer", "email": "..."}
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");
        if (email == null || password == null || email.isBlank() || password.length() < 6) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Email and password (min 6 chars) are required"));
        }
        try {
            return ResponseEntity.ok(authService.register(email, password));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/auth/login
     * Body: {"email": "...", "password": "..."}
     * Returns: {"token": "...", "role": "...", "email": "..."}
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(authService.login(body.get("email"), body.get("password")));
        } catch (IllegalArgumentException e) {
            // Return 401 — don't reveal whether email or password was wrong
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }
    }
}
