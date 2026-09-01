package com.nova.emergency.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;
import java.time.Instant;
import java.util.List;

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

    private String phone;
    private String district;
    private String organization;

    // en | ta | si
    private String language = "en";

    private String createdAt;
    private String lastActive;
    private boolean isActive = true;
    private boolean isVerified = false;
    private String otp;
    private Instant otpExpiresAt;

    // email | google
    private String provider = "email";
}
