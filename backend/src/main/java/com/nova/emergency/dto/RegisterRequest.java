package com.nova.emergency.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 60, message = "Name must be 2-60 characters")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Enter a valid email address")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    // citizen | officer | rescue_team | hospital | admin
    @NotBlank(message = "Role is required")
    private String role;

    private String phone;
    private String district;
    private String organization;

    // en | ta | si
    private String language = "en";
}
