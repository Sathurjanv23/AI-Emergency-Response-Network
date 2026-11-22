package com.nova.emergency.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RequirementVersionModelTest {

    @Test
    @DisplayName("Should create requirement version model with builder and default values")
    void shouldCreateRequirementVersionWithDefaultValues() {
        RequirementVersion version = RequirementVersion.builder()
                .id("ver-001")
                .projectId("proj-100")
                .requirementId("req-001")
                .versionNumber(1)
                .title("User Login")
                .description("Users can log in using email and password.")
                .changeSummary("Initial requirement baseline")
                .createdBy("user-001")
                .build();

        assertThat(version.getId()).isEqualTo("ver-001");
        assertThat(version.getProjectId()).isEqualTo("proj-100");
        assertThat(version.getRequirementId()).isEqualTo("req-001");
        assertThat(version.getVersionNumber()).isEqualTo(1);
        assertThat(version.getTitle()).isEqualTo("User Login");
        assertThat(version.getDescription()).isEqualTo("Users can log in using email and password.");
        assertThat(version.getChangeSummary()).isEqualTo("Initial requirement baseline");
        assertThat(version.getChangeType()).isEqualTo(ChangeType.CREATED);
        assertThat(version.getCreatedBy()).isEqualTo("user-001");
        assertThat(version.getReviewStatus()).isEqualTo(ReviewStatus.DRAFT);
        assertThat(version.getApprovedBy()).isNull();
        assertThat(version.getReviewedBy()).isNull();
        assertThat(version.getReviewComment()).isNull();
        assertThat(version.getCreatedAt()).isNotNull();
        assertThat(version.getReviewedAt()).isNull();
        assertThat(version.getApprovedAt()).isNull();
    }

    @Test
    @DisplayName("Should allow custom change types and review metadata")
    void shouldAllowCustomValuesAndReviewMetadata() {
        String now = Instant.now().toString();

        RequirementVersion version = RequirementVersion.builder()
                .id("ver-002")
                .projectId("proj-100")
                .requirementId("req-001")
                .versionNumber(2)
                .title("User Login with MFA")
                .description("Users must provide MFA verification during login.")
                .changeSummary("Added multi-factor authentication constraint")
                .changeType(ChangeType.UPDATED)
                .createdBy("user-001")
                .reviewStatus(ReviewStatus.APPROVED)
                .reviewedBy("reviewer-001")
                .approvedBy("reviewer-001")
                .reviewComment("Approved after security architecture sign-off")
                .reviewedAt(now)
                .approvedAt(now)
                .build();

        assertThat(version.getVersionNumber()).isEqualTo(2);
        assertThat(version.getChangeType()).isEqualTo(ChangeType.UPDATED);
        assertThat(version.getReviewStatus()).isEqualTo(ReviewStatus.APPROVED);
        assertThat(version.getReviewedBy()).isEqualTo("reviewer-001");
        assertThat(version.getApprovedBy()).isEqualTo("reviewer-001");
        assertThat(version.getReviewComment()).isEqualTo("Approved after security architecture sign-off");
        assertThat(version.getReviewedAt()).isEqualTo(now);
        assertThat(version.getApprovedAt()).isEqualTo(now);
    }

    @Test
    @DisplayName("Should verify ReviewStatus transitions correctly")
    void shouldVerifyReviewStatusTransitions() {
        // DRAFT can transition to IN_REVIEW or stay DRAFT
        assertThat(ReviewStatus.DRAFT.canTransitionTo(ReviewStatus.IN_REVIEW)).isTrue();
        assertThat(ReviewStatus.DRAFT.canTransitionTo(ReviewStatus.APPROVED)).isFalse();
        assertThat(ReviewStatus.DRAFT.canTransitionTo(ReviewStatus.REJECTED)).isFalse();

        // IN_REVIEW can transition to APPROVED or REJECTED
        assertThat(ReviewStatus.IN_REVIEW.canTransitionTo(ReviewStatus.APPROVED)).isTrue();
        assertThat(ReviewStatus.IN_REVIEW.canTransitionTo(ReviewStatus.REJECTED)).isTrue();
        assertThat(ReviewStatus.IN_REVIEW.canTransitionTo(ReviewStatus.DRAFT)).isFalse();

        // Terminal statuses cannot transition further
        assertThat(ReviewStatus.APPROVED.canTransitionTo(ReviewStatus.DRAFT)).isFalse();
        assertThat(ReviewStatus.APPROVED.canTransitionTo(ReviewStatus.IN_REVIEW)).isFalse();
        assertThat(ReviewStatus.APPROVED.canTransitionTo(ReviewStatus.REJECTED)).isFalse();

        assertThat(ReviewStatus.REJECTED.canTransitionTo(ReviewStatus.DRAFT)).isFalse();
        assertThat(ReviewStatus.REJECTED.canTransitionTo(ReviewStatus.IN_REVIEW)).isFalse();
        assertThat(ReviewStatus.REJECTED.canTransitionTo(ReviewStatus.APPROVED)).isFalse();
    }

    @Test
    @DisplayName("Should parse ChangeType and ReviewStatus from string case-insensitively")
    void shouldParseEnumsFromString() {
        assertThat(ChangeType.fromString("CREATED")).isEqualTo(ChangeType.CREATED);
        assertThat(ChangeType.fromString("updated")).isEqualTo(ChangeType.UPDATED);
        assertThat(ChangeType.fromString("Clarified")).isEqualTo(ChangeType.CLARIFIED);
        assertThat(ChangeType.fromString("CORRECTED")).isEqualTo(ChangeType.CORRECTED);
        assertThat(ChangeType.fromString(null)).isNull();
        assertThat(ChangeType.fromString("  ")).isNull();

        assertThatThrownBy(() -> ChangeType.fromString("INVALID"))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(ReviewStatus.fromString("DRAFT")).isEqualTo(ReviewStatus.DRAFT);
        assertThat(ReviewStatus.fromString("in_review")).isEqualTo(ReviewStatus.IN_REVIEW);
        assertThat(ReviewStatus.fromString("Approved")).isEqualTo(ReviewStatus.APPROVED);
        assertThat(ReviewStatus.fromString("REJECTED")).isEqualTo(ReviewStatus.REJECTED);
        assertThat(ReviewStatus.fromString(null)).isNull();
        assertThat(ReviewStatus.fromString("  ")).isNull();

        assertThatThrownBy(() -> ReviewStatus.fromString("UNKNOWN"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Should verify model string constants")
    void shouldVerifyConstants() {
        assertThat(RequirementVersion.STATUS_DRAFT).isEqualTo("DRAFT");
        assertThat(RequirementVersion.STATUS_IN_REVIEW).isEqualTo("IN_REVIEW");
        assertThat(RequirementVersion.STATUS_APPROVED).isEqualTo("APPROVED");
        assertThat(RequirementVersion.STATUS_REJECTED).isEqualTo("REJECTED");

        assertThat(RequirementVersion.CHANGE_CREATED).isEqualTo("CREATED");
        assertThat(RequirementVersion.CHANGE_UPDATED).isEqualTo("UPDATED");
        assertThat(RequirementVersion.CHANGE_CLARIFIED).isEqualTo("CLARIFIED");
        assertThat(RequirementVersion.CHANGE_CORRECTED).isEqualTo("CORRECTED");
    }
}
