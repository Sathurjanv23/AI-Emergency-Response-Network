package com.nova.emergency.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;
import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "users")
public class User {

    @Id
    private String id;

    private String name;

    @Indexed(unique = true)
    private String email;

    private String passwordHash;

    // citizen | officer | rescue_team | hospital | admin
    private String role;

    // ACTIVE | PENDING_VERIFICATION | DEACTIVATED
    private String status = "ACTIVE";

    private String phone;
    private String district;
    private String organization;

    // en | ta | si
    private String language = "en";

    private String createdAt;
    private String lastActive;
    private boolean isActive = true;
    private boolean isVerified = false;

    /**
     * Stores SHA-256 hex hash of the OTP (never stored in plaintext).
     */
    private String otpHash;

    private Instant otpExpiresAt;

    /**
     * Tracks number of OTP resend attempts within the rate-limit window.
     */
    private int otpAttempts = 0;

    /**
     * Timestamp of when the last OTP was issued, used for rate limiting.
     */
    private Instant otpRequestedAt;

    /**
     * Google OAuth subject ID (sub claim), set when provider = "google".
     */
    private String googleId;

    // email | google
    private String provider = "email";
}
