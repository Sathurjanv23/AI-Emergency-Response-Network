package com.nova.emergency.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OAuthExchangeRequest {
    @NotBlank(message = "Authorization exchange code is required")
    private String code;
}
