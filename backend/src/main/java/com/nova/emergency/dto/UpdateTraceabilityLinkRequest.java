package com.nova.emergency.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for updating an existing traceability relationship.
 * In this initial implementation, only the description may be updated.
 * Logical identity fields (projectId, sourceArtifactType, sourceArtifactId,
 * targetArtifactType, targetArtifactId, linkType) and lifecycle status
 * are immutable and not exposed through this contract.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateTraceabilityLinkRequest {

    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;
}
