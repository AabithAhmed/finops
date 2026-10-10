package com.finops.core.config;

import com.finops.core.entity.AppUser;
import com.finops.core.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {
    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (!userRepository.existsByEmail("operator@finops.io")) {
            AppUser operator = new AppUser();
            operator.setEmail("operator@finops.io");
            operator.setPasswordHash(passwordEncoder.encode("operator123"));
            operator.setRole("operator");
            userRepository.save(operator);
        }
        
        if (!userRepository.existsByEmail("admin@finops.io")) {
            AppUser admin = new AppUser();
            admin.setEmail("admin@finops.io");
            admin.setPasswordHash(passwordEncoder.encode("admin123"));
            admin.setRole("admin");
            userRepository.save(admin);
        }
    }
}
