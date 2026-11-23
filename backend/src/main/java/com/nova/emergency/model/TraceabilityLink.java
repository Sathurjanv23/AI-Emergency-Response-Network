package com.nova.emergency.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "traceability_links")
@CompoundIndexes({
        @CompoundIndex(name = "project_source_idx", def = "{'projectId': 1, 'sourceArtifactType': 1, 'sourceArtifactId': 1}"),
        @CompoundIndex(name = "project_target_idx", def = "{'projectId': 1, 'targetArtifactType': 1, 'targetArtifactId': 1}"),
        @CompoundIndex(name = "project_status_idx", def = "{'projectId': 1, 'status': 1}"),
        @CompoundIndex(
                name = "project_source_target_type_status_unique_idx",
                def = "{'projectId': 1, 'sourceArtifactType': 1, 'sourceArtifactId': 1, 'targetArtifactType': 1, 'targetArtifactId': 1, 'linkType': 1, 'status': 1}",
                unique = true
        )
})
public class TraceabilityLink {

    // String constants
    public static final String STATUS_ACTIVE = "ACTIVE";
    public static final String STATUS_INACTIVE = "INACTIVE";

    public static final String TYPE_DEPENDS_ON = "DEPENDS_ON";
    public static final String TYPE_RELATED_TO = "RELATED_TO";
    public static final String TYPE_IMPLEMENTED_BY = "IMPLEMENTED_BY";
    public static final String TYPE_VERIFIED_BY = "VERIFIED_BY";
    public static final String TYPE_BLOCKS = "BLOCKS";

    public static final String ARTIFACT_REQUIREMENT = "REQUIREMENT";
    public static final String ARTIFACT_TEST_CASE = "TEST_CASE";
    public static final String ARTIFACT_CODE_REFERENCE = "CODE_REFERENCE";
    public static final String ARTIFACT_GITHUB_COMMIT = "GITHUB_COMMIT";
    public static final String ARTIFACT_GITHUB_PULL_REQUEST = "GITHUB_PULL_REQUEST";

    @Id
    private String id;

    @Indexed
    private String projectId;

    @Indexed
    private TraceabilityArtifactType sourceArtifactType;

    @Indexed
    private String sourceArtifactId;

    @Indexed
    private TraceabilityArtifactType targetArtifactType;

    @Indexed
    private String targetArtifactId;

    @Indexed
    private TraceabilityLinkType linkType;

    @Indexed
    @Builder.Default
    private TraceabilityLinkStatus status = TraceabilityLinkStatus.ACTIVE;

    private String description;

    @Indexed
    private String createdBy;

    @Indexed
    @Builder.Default
    private String createdAt = Instant.now().toString();

    @Builder.Default
    private String updatedAt = Instant.now().toString();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }

    public TraceabilityArtifactType getSourceArtifactType() { return sourceArtifactType; }
    public void setSourceArtifactType(TraceabilityArtifactType sourceArtifactType) { this.sourceArtifactType = sourceArtifactType; }

    public String getSourceArtifactId() { return sourceArtifactId; }
    public void setSourceArtifactId(String sourceArtifactId) { this.sourceArtifactId = sourceArtifactId; }

    public TraceabilityArtifactType getTargetArtifactType() { return targetArtifactType; }
    public void setTargetArtifactType(TraceabilityArtifactType targetArtifactType) { this.targetArtifactType = targetArtifactType; }

    public String getTargetArtifactId() { return targetArtifactId; }
    public void setTargetArtifactId(String targetArtifactId) { this.targetArtifactId = targetArtifactId; }

    public TraceabilityLinkType getLinkType() { return linkType; }
    public void setLinkType(TraceabilityLinkType linkType) { this.linkType = linkType; }

    public TraceabilityLinkStatus getStatus() { return status; }
    public void setStatus(TraceabilityLinkStatus status) { this.status = status; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
