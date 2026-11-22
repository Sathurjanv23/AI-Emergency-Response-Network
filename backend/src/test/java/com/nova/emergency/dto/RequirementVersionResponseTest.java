package com.nova.emergency.dto;

import com.nova.emergency.model.ChangeType;
import com.nova.emergency.model.RequirementVersion;
import com.nova.emergency.model.ReviewStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class RequirementVersionResponseTest {

    @Test
    @DisplayName("Should map entity to response DTO accurately")
    void shouldMapEntityToResponse() {
        String now = Instant.now().toString();

        RequirementVersion version = RequirementVersion.builder()
                .id("ver-100")
                .projectId("proj-001")
                .requirementId("req-001")
                .versionNumber(2)
                .title("Multi-Factor Authentication Requirement")
                .description("All administrative users must use hardware tokens for MFA.")
                .changeSummary("Elevated MFA constraints for administrative access.")
                .changeType(ChangeType.UPDATED)
                .reviewStatus(ReviewStatus.APPROVED)
                .createdBy("user-author")
                .reviewedBy("user-reviewer")
                .approvedBy("user-approver")
                .reviewComment("Approved per ISO-27001 compliance standards.")
                .createdAt(now)
                .reviewedAt(now)
                .approvedAt(now)
                .build();

        RequirementVersionResponse response = RequirementVersionResponse.from(version);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo("ver-100");
        assertThat(response.getProjectId()).isEqualTo("proj-001");
        assertThat(response.getRequirementId()).isEqualTo("req-001");
        assertThat(response.getVersionNumber()).isEqualTo(2);
        assertThat(response.getTitle()).isEqualTo("Multi-Factor Authentication Requirement");
        assertThat(response.getDescription()).isEqualTo("All administrative users must use hardware tokens for MFA.");
        assertThat(response.getChangeSummary()).isEqualTo("Elevated MFA constraints for administrative access.");
        assertThat(response.getChangeType()).isEqualTo(ChangeType.UPDATED);
        assertThat(response.getReviewStatus()).isEqualTo(ReviewStatus.APPROVED);
        assertThat(response.getCreatedBy()).isEqualTo("user-author");
        assertThat(response.getReviewedBy()).isEqualTo("user-reviewer");
        assertThat(response.getApprovedBy()).isEqualTo("user-approver");
        assertThat(response.getReviewComment()).isEqualTo("Approved per ISO-27001 compliance standards.");
        assertThat(response.getCreatedAt()).isEqualTo(now);
        assertThat(response.getReviewedAt()).isEqualTo(now);
        assertThat(response.getApprovedAt()).isEqualTo(now);
    }

    @Test
    @DisplayName("Should return null when source entity is null")
    void shouldReturnNullForNullEntity() {
        assertThat(RequirementVersionResponse.from(null)).isNull();
    }
}
