package com.nova.emergency.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RequirementVersionComparisonResponseTest {

    @Test
    @DisplayName("DTO Test: RequirementVersionComparisonResponse builder and getters")
    void testComparisonResponseDTO() {
        FieldComparison fieldComp = FieldComparison.builder()
                .field("description")
                .oldValue("old")
                .newValue("new")
                .addedText(List.of("new"))
                .removedText(List.of("old"))
                .build();

        RequirementVersionComparisonResponse res = RequirementVersionComparisonResponse.builder()
                .requirementId("req-123")
                .fromVersion(1)
                .toVersion(2)
                .hasChanges(true)
                .changedFields(List.of(fieldComp))
                .unchangedFields(List.of("title"))
                .build();

        assertThat(res.getRequirementId()).isEqualTo("req-123");
        assertThat(res.getFromVersion()).isEqualTo(1);
        assertThat(res.getToVersion()).isEqualTo(2);
        assertThat(res.isHasChanges()).isTrue();
        assertThat(res.getChangedFields()).hasSize(1);
        assertThat(res.getUnchangedFields()).containsExactly("title");

        assertThat(fieldComp.getField()).isEqualTo("description");
        assertThat(fieldComp.getOldValue()).isEqualTo("old");
        assertThat(fieldComp.getNewValue()).isEqualTo("new");
        assertThat(fieldComp.getAddedText()).containsExactly("new");
        assertThat(fieldComp.getRemovedText()).containsExactly("old");
    }

    @Test
    @DisplayName("DTO Test: Review decision requests DTOs")
    void testReviewDecisionRequests() {
        ApproveRequirementVersionRequest approveReq = new ApproveRequirementVersionRequest("Approved");
        assertThat(approveReq.getReviewComment()).isEqualTo("Approved");
        approveReq.setReviewComment("Updated");
        assertThat(approveReq.getReviewComment()).isEqualTo("Updated");

        RejectRequirementVersionRequest rejectReq = new RejectRequirementVersionRequest("Rejected reason");
        assertThat(rejectReq.getReviewComment()).isEqualTo("Rejected reason");
        rejectReq.setReviewComment("New reason");
        assertThat(rejectReq.getReviewComment()).isEqualTo("New reason");
    }
}
