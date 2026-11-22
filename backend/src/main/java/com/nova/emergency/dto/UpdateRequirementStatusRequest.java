package com.nova.emergency.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateRequirementStatusRequest {

    @NotBlank(message = "Status is required")
    @Pattern(regexp = "DRAFT|IN_REVIEW|APPROVED|REJECTED|DEPRECATED", message = "Invalid requirement status")
    private String status;

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
