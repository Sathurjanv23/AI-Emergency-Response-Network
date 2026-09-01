package com.nova.emergency.service;

import com.nova.emergency.dto.AuthResponse;
import com.nova.emergency.dto.LoginRequest;
import com.nova.emergency.dto.RegisterRequest;
import com.nova.emergency.dto.VerifyOtpRequest;
import com.nova.emergency.model.User;
import com.nova.emergency.repository.UserRepository;
import com.nova.emergency.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.Random;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;

    public AuthResponse register(RegisterRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        Optional<User> existingOpt = userRepository.findByEmail(email);

        if (existingOpt.isPresent()) {
            User existing = existingOpt.get();
            if (existing.isVerified()) {
                throw new IllegalArgumentException("An account with this email already exists. Please sign in.");
            }
            // User exists but was not verified yet, update their info and resend OTP
            existing.setName(request.getName().trim());
            existing.setPasswordHash(passwordEncoder.encode(request.getPassword()));
            existing.setRole(request.getRole());
            existing.setPhone(request.getPhone());
            existing.setDistrict(request.getDistrict());
            existing.setOrganization(request.getOrganization());
            existing.setLanguage(request.getLanguage() != null ? request.getLanguage() : "en");
            existing.setLastActive(Instant.now().toString());

            String otp = generateOtp();
            existing.setOtp(otp);
            existing.setOtpExpiresAt(Instant.now().plus(10, ChronoUnit.MINUTES));
            userRepository.save(existing);

            emailService.sendOtpEmail(email, otp, existing.getName());
            return buildPendingVerificationResponse(existing);
        }

        User user = new User();
        user.setName(request.getName().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());
        user.setPhone(request.getPhone());
        user.setDistrict(request.getDistrict());
        user.setOrganization(request.getOrganization());
        user.setLanguage(request.getLanguage() != null ? request.getLanguage() : "en");
        user.setCreatedAt(Instant.now().toString());
        user.setLastActive(Instant.now().toString());
        user.setActive(true);
        user.setVerified(false);  // Requires email OTP verification
        user.setProvider("email");

        String otp = generateOtp();
        user.setOtp(otp);
        user.setOtpExpiresAt(Instant.now().plus(10, ChronoUnit.MINUTES));

        User saved = userRepository.save(user);
        log.info("New registration pending verification: {} ({})", saved.getEmail(), saved.getRole());

        // Send OTP email via Gmail SMTP
        emailService.sendOtpEmail(email, otp, saved.getName());

        return buildPendingVerificationResponse(saved);
    }

    public AuthResponse verifyOtp(VerifyOtpRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        String inputOtp = request.getOtp().trim();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("No account found for " + email));

        if (user.getOtp() == null || !user.getOtp().equals(inputOtp)) {
            throw new IllegalArgumentException("Invalid verification code. Please check and try again.");
        }

        if (user.getOtpExpiresAt() != null && user.getOtpExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Verification code has expired. Please request a new code.");
        }

        // Activate and verify user
        user.setVerified(true);
        user.setOtp(null);
        user.setOtpExpiresAt(null);
        user.setLastActive(Instant.now().toString());
        User verifiedUser = userRepository.save(user);

        log.info("✅ Account successfully verified via email OTP: {}", email);

        String token = jwtUtil.generateToken(verifiedUser.getEmail(), verifiedUser.getRole(), verifiedUser.getId());
        return buildAuthResponse(token, verifiedUser);
    }

    public void resendOtp(String email) {
        String normalizedEmail = email.toLowerCase().trim();
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new IllegalArgumentException("No account found for " + normalizedEmail));

        if (user.isVerified()) {
            throw new IllegalArgumentException("Account is already verified. Please sign in.");
        }

        String otp = generateOtp();
        user.setOtp(otp);
        user.setOtpExpiresAt(Instant.now().plus(10, ChronoUnit.MINUTES));
        userRepository.save(user);

        log.info("Resending OTP to: {}", normalizedEmail);
        emailService.sendOtpEmail(normalizedEmail, otp, user.getName());
    }

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    request.getEmail().toLowerCase().trim(),
                    request.getPassword()
                )
            );
        } catch (AuthenticationException e) {
            throw new IllegalArgumentException("Invalid email or password. Please try again.");
        }

        User user = userRepository.findByEmail(request.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new IllegalArgumentException("User not found."));

        if (!user.isVerified()) {
            // Re-send OTP if unverified
            String otp = generateOtp();
            user.setOtp(otp);
            user.setOtpExpiresAt(Instant.now().plus(10, ChronoUnit.MINUTES));
            userRepository.save(user);
            emailService.sendOtpEmail(user.getEmail(), otp, user.getName());

            throw new IllegalArgumentException("Your email is not verified yet. A new verification code was sent to " + user.getEmail());
        }

        // Update last active
        user.setLastActive(Instant.now().toString());
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole(), user.getId());
        log.info("User logged in: {}", user.getEmail());
        return buildAuthResponse(token, user);
    }

    private String generateOtp() {
        Random random = new Random();
        int code = 100000 + random.nextInt(900000);
        return String.valueOf(code);
    }

    private AuthResponse buildPendingVerificationResponse(User user) {
        AuthResponse response = new AuthResponse();
        response.setAccessToken(null);
        response.setTokenType("Bearer");
        response.setExpiresIn(0);
        response.setUser(AuthResponse.UserDto.from(user));
        return response;
    }

    private AuthResponse buildAuthResponse(String token, User user) {
        AuthResponse response = new AuthResponse();
        response.setAccessToken(token);
        response.setTokenType("Bearer");
        response.setExpiresIn(jwtUtil.getExpirationMs() / 1000);
        response.setUser(AuthResponse.UserDto.from(user));
        return response;
    }
}
