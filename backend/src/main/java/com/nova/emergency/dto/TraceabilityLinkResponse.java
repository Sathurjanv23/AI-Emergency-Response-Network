package com.nova.emergency.dto;

import com.nova.emergency.model.TraceabilityArtifactType;
import com.nova.emergency.model.TraceabilityLink;
import com.nova.emergency.model.TraceabilityLinkStatus;
import com.nova.emergency.model.TraceabilityLinkType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO representing a traceability link.
 * Exposes domain entity fields without leaking MongoDB implementation details
 * or fabricating unverified artifact metadata.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TraceabilityLinkResponse {

    private String id;
    private String projectId;
    private TraceabilityArtifactType sourceArtifactType;
    private String sourceArtifactId;
    private TraceabilityArtifactType targetArtifactType;
    private String targetArtifactId;
    private TraceabilityLinkType linkType;
    private TraceabilityLinkStatus status;
    private String description;
    private String createdBy;
    private String createdAt;
    private String updatedAt;

    /**
     * Maps a {@link TraceabilityLink} entity to a {@link TraceabilityLinkResponse} DTO.
     * Preserves enum values, timestamps, and optional description without mutating the source entity.
     *
     * @param link the source domain entity (may be null)
     * @return the mapped response DTO, or null if the source entity is null
     */
    public static TraceabilityLinkResponse from(TraceabilityLink link) {
        if (link == null) {
            return null;
        }
        return TraceabilityLinkResponse.builder()
                .id(link.getId())
                .projectId(link.getProjectId())
                .sourceArtifactType(link.getSourceArtifactType())
                .sourceArtifactId(link.getSourceArtifactId())
                .targetArtifactType(link.getTargetArtifactType())
                .targetArtifactId(link.getTargetArtifactId())
                .linkType(link.getLinkType())
                .status(link.getStatus())
                .description(link.getDescription())
                .createdBy(link.getCreatedBy())
                .createdAt(link.getCreatedAt())
                .updatedAt(link.getUpdatedAt())
                .build();
    }

    /**
     * Alias for {@link #from(TraceabilityLink)} conforming to fromEntity naming conventions.
     */
    public static TraceabilityLinkResponse fromEntity(TraceabilityLink link) {
        return from(link);
    }
}
