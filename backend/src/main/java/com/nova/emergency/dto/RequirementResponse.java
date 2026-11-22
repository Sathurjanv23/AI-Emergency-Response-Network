package com.nova.emergency.dto;

import com.nova.emergency.model.Requirement;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RequirementResponse {
    private String id;
    private String projectId;
    private String requirementKey;
    private String title;
    private String description;
    private String type;
    private String priority;
    private String status;
    private String sourceDocumentId;
    private String currentVersionId;
    private String createdBy;
    private String createdAt;
    private String updatedAt;

    public static RequirementResponse from(Requirement requirement) {
        if (requirement == null) return null;
        return RequirementResponse.builder()
                .id(requirement.getId())
                .projectId(requirement.getProjectId())
                .requirementKey(requirement.getRequirementKey())
                .title(requirement.getTitle())
                .description(requirement.getDescription())
                .type(requirement.getType())
                .priority(requirement.getPriority())
                .status(requirement.getStatus())
                .sourceDocumentId(requirement.getSourceDocumentId())
                .currentVersionId(requirement.getCurrentVersionId())
                .createdBy(requirement.getCreatedBy())
                .createdAt(requirement.getCreatedAt())
                .updatedAt(requirement.getUpdatedAt())
                .build();
    }
}
