package com.nova.emergency.dto;

import com.nova.emergency.model.TraceabilityArtifactType;
import com.nova.emergency.model.TraceabilityLinkType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for creating a new traceability relationship.
 * Client-controlled identity (id, projectId), lifecycle state (status),
 * and audit metadata (createdBy, createdAt, updatedAt) are strictly excluded.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateTraceabilityLinkRequest {

    @NotNull(message = "Source artifact type is required")
    private TraceabilityArtifactType sourceArtifactType;

    @NotBlank(message = "Source artifact ID is required")
    @Size(max = 100, message = "Source artifact ID must not exceed 100 characters")
    private String sourceArtifactId;

    @NotNull(message = "Target artifact type is required")
    private TraceabilityArtifactType targetArtifactType;

    @NotBlank(message = "Target artifact ID is required")
    @Size(max = 100, message = "Target artifact ID must not exceed 100 characters")
    private String targetArtifactId;

    @NotNull(message = "Link type is required")
    private TraceabilityLinkType linkType;

    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;
}
