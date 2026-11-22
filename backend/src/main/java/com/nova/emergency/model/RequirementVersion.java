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
@Document(collection = "requirement_versions")
@CompoundIndexes({
        @CompoundIndex(name = "req_version_unique_idx", def = "{'requirementId': 1, 'versionNumber': 1}", unique = true),
        @CompoundIndex(name = "project_req_version_idx", def = "{'projectId': 1, 'requirementId': 1, 'versionNumber': -1}"),
        @CompoundIndex(name = "project_review_status_idx", def = "{'projectId': 1, 'reviewStatus': 1}"),
        @CompoundIndex(name = "req_review_status_idx", def = "{'requirementId': 1, 'reviewStatus': 1}")
})
public class RequirementVersion {

    public static final String STATUS_DRAFT = "DRAFT";
    public static final String STATUS_IN_REVIEW = "IN_REVIEW";
    public static final String STATUS_APPROVED = "APPROVED";
    public static final String STATUS_REJECTED = "REJECTED";

    public static final String CHANGE_CREATED = "CREATED";
    public static final String CHANGE_UPDATED = "UPDATED";
    public static final String CHANGE_CLARIFIED = "CLARIFIED";
    public static final String CHANGE_CORRECTED = "CORRECTED";

    @Id
    private String id;

    @Indexed
    private String projectId;

    @Indexed
    private String requirementId;

    @Indexed
    private Integer versionNumber;

    private String title;

    private String description;

    private String changeSummary;

    @Builder.Default
    private ChangeType changeType = ChangeType.CREATED;

    @Indexed
    private String createdBy;

    @Indexed
    @Builder.Default
    private ReviewStatus reviewStatus = ReviewStatus.DRAFT;

    private String approvedBy;

    private String reviewedBy;

    private String reviewComment;

    @Indexed
    @Builder.Default
    private String createdAt = Instant.now().toString();

    private String reviewedAt;

    private String approvedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }

    public String getRequirementId() { return requirementId; }
    public void setRequirementId(String requirementId) { this.requirementId = requirementId; }

    public Integer getVersionNumber() { return versionNumber; }
    public void setVersionNumber(Integer versionNumber) { this.versionNumber = versionNumber; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getChangeSummary() { return changeSummary; }
    public void setChangeSummary(String changeSummary) { this.changeSummary = changeSummary; }

    public ChangeType getChangeType() { return changeType; }
    public void setChangeType(ChangeType changeType) { this.changeType = changeType; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public ReviewStatus getReviewStatus() { return reviewStatus; }
    public void setReviewStatus(ReviewStatus reviewStatus) { this.reviewStatus = reviewStatus; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public String getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(String reviewedBy) { this.reviewedBy = reviewedBy; }

    public String getReviewComment() { return reviewComment; }
    public void setReviewComment(String reviewComment) { this.reviewComment = reviewComment; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(String reviewedAt) { this.reviewedAt = reviewedAt; }

    public String getApprovedAt() { return approvedAt; }
    public void setApprovedAt(String approvedAt) { this.approvedAt = approvedAt; }
}
