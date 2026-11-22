package com.nova.emergency.dto;

import com.nova.emergency.model.ChangeType;
import com.nova.emergency.model.RequirementVersion;
import com.nova.emergency.model.ReviewStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RequirementVersionResponse {

    private String id;
    private String projectId;
    private String requirementId;
    private Integer versionNumber;
    private String title;
    private String description;
    private String changeSummary;
    private ChangeType changeType;
    private ReviewStatus reviewStatus;
    private String createdBy;
    private String reviewedBy;
    private String approvedBy;
    private String reviewComment;
    private String createdAt;
    private String reviewedAt;
    private String approvedAt;

    public static RequirementVersionResponse from(RequirementVersion version) {
        if (version == null) {
            return null;
        }
        return RequirementVersionResponse.builder()
                .id(version.getId())
                .projectId(version.getProjectId())
                .requirementId(version.getRequirementId())
                .versionNumber(version.getVersionNumber())
                .title(version.getTitle())
                .description(version.getDescription())
                .changeSummary(version.getChangeSummary())
                .changeType(version.getChangeType())
                .reviewStatus(version.getReviewStatus())
                .createdBy(version.getCreatedBy())
                .reviewedBy(version.getReviewedBy())
                .approvedBy(version.getApprovedBy())
                .reviewComment(version.getReviewComment())
                .createdAt(version.getCreatedAt())
                .reviewedAt(version.getReviewedAt())
                .approvedAt(version.getApprovedAt())
                .build();
    }

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

    public ReviewStatus getReviewStatus() { return reviewStatus; }
    public void setReviewStatus(ReviewStatus reviewStatus) { this.reviewStatus = reviewStatus; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(String reviewedBy) { this.reviewedBy = reviewedBy; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public String getReviewComment() { return reviewComment; }
    public void setReviewComment(String reviewComment) { this.reviewComment = reviewComment; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(String reviewedAt) { this.reviewedAt = reviewedAt; }

    public String getApprovedAt() { return approvedAt; }
    public void setApprovedAt(String approvedAt) { this.approvedAt = approvedAt; }
}
