package com.nova.emergency.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GoogleRegisterRequest {

    @NotBlank(message = "Registration intent token is required")
    private String registrationIntent;

    @NotBlank(message = "Role selection is required")
    private String role;

    private String phone;
    private String district;
    private String organization;
    private String language = "en";
}
