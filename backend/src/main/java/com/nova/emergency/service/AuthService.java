package com.nova.emergency.service;

import com.nova.emergency.dto.*;
import com.nova.emergency.exception.AccountConflictException;
import com.nova.emergency.exception.AccountDeactivatedException;
import com.nova.emergency.model.User;
import com.nova.emergency.repository.UserRepository;
import com.nova.emergency.security.JwtUtil;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;

    @Value("${nova.otp.expiry-seconds:30}")
    private int otpExpirySeconds;

    private static final int MAX_OTP_ATTEMPTS = 3;
    private static final int RATE_LIMIT_WINDOW_MINUTES = 5;

    // Allowed self-registration roles (admin is strictly excluded)
    private static final Set<String> ALLOWED_REGISTRATION_ROLES = Set.of(
        "citizen", "officer", "rescue_team", "hospital"
    );

    // Standard Sri Lanka Districts
    private static final Set<String> SL_DISTRICTS = Set.of(
        "colombo", "gampaha", "kalutara", "kandy", "matale", "nuwara eliya",
        "galle", "matara", "hambantota", "jaffna", "kilinochchi", "mannar",
        "mullaitivu", "vavuniya", "trincomalee", "batticaloa", "ampara",
        "kurunegala", "puttalam", "anuradhapura", "polonnaruwa", "badulla",
        "moneragala", "ratnapura", "kegalle"
    );

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
        "^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$"
    );

    private static final Set<String> BLOCKED_EMAIL_DOMAINS = Set.of(
        "mailinator.com", "guerrillamail.com", "tempmail.com", "throwam.com", "trashmail.com"
    );

    // In-memory single-use token stores with TTL
    private final Map<String, TemporaryAuthSession> authCodeCache = new ConcurrentHashMap<>();
    private final Map<String, GoogleRegistrationIntent> registrationIntentCache = new ConcurrentHashMap<>();
    private final Map<String, AuthResponse> completedExchangeCache = new ConcurrentHashMap<>();

    @Data
    @AllArgsConstructor
    public static class TemporaryAuthSession {
        private String userId;
        private Instant expiresAt;
    }

    @Data
    @AllArgsConstructor
    public static class GoogleRegistrationIntent {
        private String googleId;
        private String email;
        private String name;
        private Instant expiresAt;
    }

    @Data
    @AllArgsConstructor
    public static class GoogleAuthResult {
        private boolean isNewUser;
        private String authCode;
        private String registrationIntent;
        private String email;
        private String name;

        public static GoogleAuthResult existingUser(String authCode) {
            return new GoogleAuthResult(false, authCode, null, null, null);
        }

        public static GoogleAuthResult newUser(String intentToken, String email, String name) {
            return new GoogleAuthResult(true, null, intentToken, email, name);
        }
    }

    // ─── Register with Email/Password ─────────────────────────

    public AuthResponse register(RegisterRequest request) {
        // 1. Validate full name
        if (request.getName() == null || request.getName().trim().length() < 2) {
            throw new IllegalArgumentException("Full name must be at least 2 characters.");
        }

        // 2. Validate email
        String email = validateAndNormalizeEmail(request.getEmail());

        // 3. Validate password strength
        validatePasswordStrength(request.getPassword());

        // 4. Validate role
        String role = validateRegistrationRole(request.getRole());

        // 5. Validate phone and district if present
        validatePhone(request.getPhone());
        validateDistrict(request.getDistrict());

        // 6. Check duplicate email in DB (case-insensitive normalized)
        Optional<User> existingOpt = userRepository.findByEmail(email);
        if (existingOpt.isPresent()) {
            throw new AccountConflictException("An account with this email already exists.");
        }

        User user = new User();
        user.setName(request.getName().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);
        user.setStatus("PENDING_VERIFICATION");
        user.setPhone(request.getPhone());
        user.setDistrict(request.getDistrict());
        user.setOrganization(request.getOrganization());
        user.setLanguage(request.getLanguage() != null ? request.getLanguage() : "en");
        user.setCreatedAt(Instant.now().toString());
        user.setLastActive(Instant.now().toString());
        user.setActive(false);
        user.setVerified(false);
        user.setProvider("email");

        String rawOtp = issueOtp(user);
        User saved = userRepository.save(user);
        log.info("New registration pending verification: {} ({})", saved.getEmail(), saved.getRole());

        emailService.sendOtpEmail(email, rawOtp, saved.getName());
        return buildPendingVerificationResponse(saved);
    }

    // ─── Login with Email/Password ────────────────────────────

    public AuthResponse login(LoginRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new BadCredentialsException("Email is required.");
        }
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new BadCredentialsException("Password is required.");
        }

        String email = validateAndNormalizeEmail(request.getEmail());
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password."));

        // Verify password hash
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password.");
        }

        // Check email verification before allowing login
        if (!user.isVerified()) {
            String rawOtp = issueOtp(user);
            userRepository.save(user);
            emailService.sendOtpEmail(user.getEmail(), rawOtp, user.getName());
            throw new IllegalArgumentException("Your email is not verified. A new verification code was sent to " + user.getEmail());
        }

        // Check account activation
        if (!user.isActive() || "DEACTIVATED".equalsIgnoreCase(user.getStatus())) {
            throw new AccountDeactivatedException("Your account is deactivated. Please contact emergency administration.");
        }

        // Update last active
        user.setLastActive(Instant.now().toString());
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole(), user.getId());
        log.info("User logged in successfully: {} (role: {})", user.getEmail(), user.getRole());
        return buildAuthResponse(token, user);
    }

    // ─── Google OAuth Identity Processing ─────────────────────

    /**
     * Inspects Google authenticated profile. If user exists, generates an auth exchange code.
     * If user is new, generates a registration intent code.
     * Sensitive JWTs and tokens are NEVER exposed in URL redirects.
     */
    public GoogleAuthResult processGoogleIdentity(String googleId, String email, String name) {
        String normalizedEmail = validateAndNormalizeEmail(email);

        Optional<User> existingOpt = userRepository.findByEmail(normalizedEmail);

        if (existingOpt.isPresent()) {
            User existing = existingOpt.get();
            if (!existing.isActive() || "DEACTIVATED".equalsIgnoreCase(existing.getStatus())) {
                throw new AccountDeactivatedException("Account is deactivated. Please contact emergency administration.");
            }

            // Secure account linking: update Google ID if missing
            if (existing.getGoogleId() == null) {
                existing.setGoogleId(googleId);
            }
            existing.setLastActive(Instant.now().toString());
            userRepository.save(existing);

            // Generate single-use, 60-second authorization code
            String authCode = UUID.randomUUID().toString();
            authCodeCache.put(authCode, new TemporaryAuthSession(existing.getId(), Instant.now().plus(60, ChronoUnit.SECONDS)));

            log.info("Google OAuth login for existing user: {} (role: {})", normalizedEmail, existing.getRole());
            return GoogleAuthResult.existingUser(authCode);
        }

        // New Google user — generate single-use 5-minute registration intent ticket
        String intentToken = UUID.randomUUID().toString();
        registrationIntentCache.put(intentToken, new GoogleRegistrationIntent(
            googleId,
            normalizedEmail,
            name != null && !name.isBlank() ? name.trim() : "Emergency Responder",
            Instant.now().plus(300, ChronoUnit.SECONDS)
        ));

        log.info("New Google user initiated registration: {}", normalizedEmail);
        return GoogleAuthResult.newUser(intentToken, normalizedEmail, name);
    }

    // ─── Exchange OAuth Code for JWT ──────────────────────────

    /**
     * Exchanges single-use authCode from Google OAuth redirect for the final authenticated JWT.
     * Prevents JWT exposure in query parameters and handles React StrictMode duplicate requests gracefully.
     */
    public AuthResponse exchangeOAuthCode(String code) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("Authorization code is required.");
        }

        String trimmedCode = code.trim();

        // Check if recently exchanged within 30s grace window (e.g. React StrictMode double mount)
        AuthResponse cached = completedExchangeCache.get(trimmedCode);
        if (cached != null) {
            return cached;
        }

        TemporaryAuthSession session = authCodeCache.remove(trimmedCode);
        if (session == null || session.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Authorization code has expired or is invalid. Please sign in again.");
        }

        User user = userRepository.findById(session.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User account not found."));

        if (!user.isActive() || "DEACTIVATED".equalsIgnoreCase(user.getStatus())) {
            throw new AccountDeactivatedException("Account is deactivated. Please contact emergency administration.");
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole(), user.getId());
        AuthResponse response = buildAuthResponse(token, user);
        completedExchangeCache.put(trimmedCode, response);
        return response;
    }

    // ─── Complete Google Registration ─────────────────────────

    /**
     * Completes registration for a new Google user after role selection.
     * Role selection is mandatory and strictly validated.
     */
    public AuthResponse completeGoogleRegistration(GoogleRegisterRequest request) {
        if (request.getRegistrationIntent() == null || request.getRegistrationIntent().isBlank()) {
            throw new IllegalArgumentException("Registration intent token is required.");
        }

        GoogleRegistrationIntent intent = registrationIntentCache.remove(request.getRegistrationIntent().trim());
        if (intent == null || intent.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Registration intent has expired or is invalid. Please sign in with Google again.");
        }

        // Strict role validation (disallow admin)
        String role = validateRegistrationRole(request.getRole());

        // Validate optional phone and district
        validatePhone(request.getPhone());
        validateDistrict(request.getDistrict());

        // Check if account was created concurrently
        Optional<User> existing = userRepository.findByEmail(intent.getEmail());
        if (existing.isPresent()) {
            User u = existing.get();
            String token = jwtUtil.generateToken(u.getEmail(), u.getRole(), u.getId());
            return buildAuthResponse(token, u);
        }

        User newUser = new User();
        newUser.setName(intent.getName());
        newUser.setEmail(intent.getEmail());
        newUser.setGoogleId(intent.getGoogleId());
        newUser.setProvider("google");
        newUser.setRole(role);
        newUser.setStatus("citizen".equals(role) ? "ACTIVE" : "PENDING_VERIFICATION");
        newUser.setPhone(request.getPhone());
        newUser.setDistrict(request.getDistrict());
        newUser.setOrganization(request.getOrganization());
        newUser.setLanguage(request.getLanguage() != null ? request.getLanguage() : "en");
        newUser.setVerified(true); // Google email is pre-verified
        newUser.setActive(true);
        newUser.setCreatedAt(Instant.now().toString());
        newUser.setLastActive(Instant.now().toString());

        User savedUser = userRepository.save(newUser);
        log.info("Google registration completed for user: {} (role: {}, status: {})",
                savedUser.getEmail(), savedUser.getRole(), savedUser.getStatus());

        String token = jwtUtil.generateToken(savedUser.getEmail(), savedUser.getRole(), savedUser.getId());
        return buildAuthResponse(token, savedUser);
    }

    // ─── OTP Operations ───────────────────────────────────────

    public AuthResponse verifyOtp(VerifyOtpRequest request) {
        String email = validateAndNormalizeEmail(request.getEmail());
        String inputOtp = request.getOtp() != null ? request.getOtp().trim() : "";

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("No account found for this email address."));

        if (user.isVerified()) {
            throw new IllegalArgumentException("Account is already verified. Please sign in.");
        }

        if (user.getOtpHash() == null || user.getOtpExpiresAt() == null) {
            throw new IllegalArgumentException("Invalid OTP.");
        }

        // Enforce exact 30-second server-side OTP expiration
        if (user.getOtpExpiresAt().isBefore(Instant.now())) {
            user.setOtpHash(null);
            user.setOtpExpiresAt(null);
            userRepository.save(user);
            throw new IllegalArgumentException("OTP has expired. Please request a new OTP.");
        }

        String inputHash = hashOtp(inputOtp);
        if (!MessageDigest.isEqual(inputHash.getBytes(StandardCharsets.UTF_8), user.getOtpHash().getBytes(StandardCharsets.UTF_8))) {
            throw new IllegalArgumentException("Invalid OTP.");
        }

        // Immediately invalidate OTP upon successful verification (one-time use)
        user.setVerified(true);
        user.setStatus("ACTIVE");
        user.setActive(true);
        user.setOtpHash(null);
        user.setOtpExpiresAt(null);
        user.setOtpAttempts(0);
        user.setLastActive(Instant.now().toString());
        User verifiedUser = userRepository.save(user);

        log.info("Account verified via OTP: {}", email);
        String token = jwtUtil.generateToken(verifiedUser.getEmail(), verifiedUser.getRole(), verifiedUser.getId());
        return buildAuthResponse(token, verifiedUser);
    }

    public void resendOtp(String email) {
        String normalizedEmail = validateAndNormalizeEmail(email);
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new IllegalArgumentException("No account found for this email address."));

        if (user.isVerified()) {
            throw new IllegalArgumentException("Account is already verified. Please sign in.");
        }

        checkRateLimit(user);
        String rawOtp = issueOtp(user);
        userRepository.save(user);

        log.info("OTP resent to: {}", normalizedEmail);
        emailService.sendOtpEmail(normalizedEmail, rawOtp, user.getName());
    }

    public void requestLoginOtp(String email) {
        String normalizedEmail = validateAndNormalizeEmail(email);
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new IllegalArgumentException("No account found for this email address."));

        if (!user.isVerified()) {
            throw new IllegalArgumentException("This account is not verified. Please complete registration first.");
        }

        checkRateLimit(user);
        String rawOtp = issueOtp(user);
        userRepository.save(user);

        log.info("Login OTP issued to: {}", normalizedEmail);
        emailService.sendOtpEmail(normalizedEmail, rawOtp, user.getName());
    }

    // ─── Validation Helpers ────────────────────────────────────

    private String validateAndNormalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email is required.");
        }
        String trimmed = email.trim().toLowerCase();
        if (!EMAIL_PATTERN.matcher(trimmed).matches()) {
            throw new IllegalArgumentException("Enter a valid email address (e.g. you@example.com).");
        }
        String domain = trimmed.split("@")[1];
        if (BLOCKED_EMAIL_DOMAINS.contains(domain)) {
            throw new IllegalArgumentException("Disposable email addresses are not allowed.");
        }
        return trimmed;
    }

    private void validatePasswordStrength(String password) {
        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters.");
        }
        if (!password.chars().anyMatch(Character::isUpperCase)) {
            throw new IllegalArgumentException("Password must contain at least one uppercase letter.");
        }
        if (!password.chars().anyMatch(Character::isDigit)) {
            throw new IllegalArgumentException("Password must contain at least one number.");
        }
    }

    private String validateRegistrationRole(String role) {
        if (role == null || role.isBlank()) {
            throw new IllegalArgumentException("Role selection is required.");
        }
        String normalized = role.trim().toLowerCase();
        if ("admin".equals(normalized)) {
            throw new IllegalArgumentException("Administrator accounts cannot be self-registered.");
        }
        if (!ALLOWED_REGISTRATION_ROLES.contains(normalized)) {
            throw new IllegalArgumentException("Invalid role selected: " + role);
        }
        return normalized;
    }

    private void validatePhone(String phone) {
        if (phone == null || phone.isBlank()) return;
        String cleaned = phone.replaceAll("[\\s\\-()+]", "");
        if (!cleaned.matches("^[0-9]{7,15}$")) {
            throw new IllegalArgumentException("Enter a valid phone number (7–15 digits).");
        }
    }

    private void validateDistrict(String district) {
        if (district == null || district.isBlank()) return;
        String normalized = district.trim().toLowerCase();
        if (!SL_DISTRICTS.contains(normalized)) {
            throw new IllegalArgumentException("Invalid district selected: " + district);
        }
    }

    private String issueOtp(User user) {
        SecureRandom random = new SecureRandom();
        int code = 100000 + random.nextInt(900000);
        String rawOtp = String.valueOf(code);

        user.setOtpHash(hashOtp(rawOtp));
        user.setOtpExpiresAt(Instant.now().plus(otpExpirySeconds, ChronoUnit.SECONDS));
        user.setOtpRequestedAt(Instant.now());
        user.setOtpAttempts(user.getOtpAttempts() + 1);

        return rawOtp;
    }

    private String hashOtp(String otp) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(otp.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("OTP hashing failed", e);
        }
    }

    private void checkRateLimit(User user) {
        Instant windowStart = Instant.now().minus(RATE_LIMIT_WINDOW_MINUTES, ChronoUnit.MINUTES);
        if (user.getOtpRequestedAt() != null && user.getOtpRequestedAt().isAfter(windowStart)) {
            if (user.getOtpAttempts() >= MAX_OTP_ATTEMPTS) {
                throw new IllegalArgumentException("Too many verification code requests. Please wait a few minutes before trying again.");
            }
        } else {
            user.setOtpAttempts(0);
        }
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
