package com.nova.emergency.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OtpRequestDto {

    @NotBlank(message = "Email is required")
    @Email(message = "Must be a valid email address")
    private String email;
}
