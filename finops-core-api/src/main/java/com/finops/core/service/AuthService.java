package com.finops.core.service;

import com.finops.core.entity.AppUser;
import com.finops.core.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AppUserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    /**
     * Register a new user. Role defaults to 'viewer' as per the schema constraint.
     * Returns the generated JWT so the client can log in immediately after registering.
     */
    public Map<String, String> register(String email, String password) {
        if (userRepo.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already registered");
        }
        AppUser user = new AppUser();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole("viewer");
        userRepo.save(user);

        String token = jwtService.generateToken(email, "viewer");
        return Map.of("token", token, "role", "viewer", "email", email);
    }

    /**
     * Login: verify email exists and password matches the bcrypt hash.
     * Returns a JWT on success, throws on failure.
     */
    public Map<String, String> login(String email, String password) {
        AppUser user = userRepo.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        String token = jwtService.generateToken(email, user.getRole());
        return Map.of("token", token, "role", user.getRole(), "email", email);
    }
}
