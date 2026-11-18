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
@Document(collection = "requirements")
@CompoundIndexes({
        @CompoundIndex(name = "project_reqkey_idx", def = "{'projectId': 1, 'requirementKey': 1}", unique = true),
        @CompoundIndex(name = "project_created_idx", def = "{'projectId': 1, 'createdAt': -1}"),
        @CompoundIndex(name = "project_status_idx", def = "{'projectId': 1, 'status': 1}"),
        @CompoundIndex(name = "project_priority_idx", def = "{'projectId': 1, 'priority': 1}")
})
public class Requirement {

    // Requirement Types
    public static final String TYPE_FUNCTIONAL = "FUNCTIONAL";
    public static final String TYPE_NON_FUNCTIONAL = "NON_FUNCTIONAL";

    // Priorities
    public static final String PRIORITY_LOW = "LOW";
    public static final String PRIORITY_MEDIUM = "MEDIUM";
    public static final String PRIORITY_HIGH = "HIGH";
    public static final String PRIORITY_CRITICAL = "CRITICAL";

    // Statuses
    public static final String STATUS_DRAFT = "DRAFT";
    public static final String STATUS_IN_REVIEW = "IN_REVIEW";
    public static final String STATUS_APPROVED = "APPROVED";
    public static final String STATUS_REJECTED = "REJECTED";
    public static final String STATUS_DEPRECATED = "DEPRECATED";

    @Id
    private String id;

    @Indexed
    private String projectId;

    @Indexed
    private String requirementKey;

    private String title;

    private String description;

    @Builder.Default
    private String type = TYPE_FUNCTIONAL;

    @Builder.Default
    private String priority = PRIORITY_MEDIUM;

    @Indexed
    @Builder.Default
    private String status = STATUS_DRAFT;

    private String sourceDocumentId;

    private String currentVersionId;

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

    public String getRequirementKey() { return requirementKey; }
    public void setRequirementKey(String requirementKey) { this.requirementKey = requirementKey; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getSourceDocumentId() { return sourceDocumentId; }
    public void setSourceDocumentId(String sourceDocumentId) { this.sourceDocumentId = sourceDocumentId; }

    public String getCurrentVersionId() { return currentVersionId; }
    public void setCurrentVersionId(String currentVersionId) { this.currentVersionId = currentVersionId; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
