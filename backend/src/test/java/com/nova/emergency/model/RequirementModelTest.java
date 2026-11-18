package com.nova.emergency.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RequirementModelTest {

    @Test
    @DisplayName("Should create requirement model with builder and default values")
    void shouldCreateRequirementWithDefaultValues() {
        Requirement requirement = Requirement.builder()
                .id("req-001")
                .projectId("proj-100")
                .requirementKey("REQ-001")
                .title("User Authentication via OAuth2")
                .description("System shall support OAuth2 / OIDC login providers.")
                .createdBy("user-admin")
                .build();

        assertThat(requirement.getId()).isEqualTo("req-001");
        assertThat(requirement.getProjectId()).isEqualTo("proj-100");
        assertThat(requirement.getRequirementKey()).isEqualTo("REQ-001");
        assertThat(requirement.getTitle()).isEqualTo("User Authentication via OAuth2");
        assertThat(requirement.getDescription()).isEqualTo("System shall support OAuth2 / OIDC login providers.");
        assertThat(requirement.getType()).isEqualTo(Requirement.TYPE_FUNCTIONAL);
        assertThat(requirement.getPriority()).isEqualTo(Requirement.PRIORITY_MEDIUM);
        assertThat(requirement.getStatus()).isEqualTo(Requirement.STATUS_DRAFT);
        assertThat(requirement.getCreatedBy()).isEqualTo("user-admin");
        assertThat(requirement.getSourceDocumentId()).isNull();
        assertThat(requirement.getCurrentVersionId()).isNull();
        assertThat(requirement.getCreatedAt()).isNotNull();
        assertThat(requirement.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("Should allow custom type, priority, status and document references")
    void shouldAllowCustomValues() {
        Requirement requirement = Requirement.builder()
                .id("req-002")
                .projectId("proj-100")
                .requirementKey("NFR-001")
                .title("API Latency Limit")
                .description("99th percentile response time must not exceed 200ms.")
                .type(Requirement.TYPE_NON_FUNCTIONAL)
                .priority(Requirement.PRIORITY_CRITICAL)
                .status(Requirement.STATUS_IN_REVIEW)
                .sourceDocumentId("doc-500")
                .currentVersionId("ver-001")
                .createdBy("user-architect")
                .build();

        assertThat(requirement.getType()).isEqualTo(Requirement.TYPE_NON_FUNCTIONAL);
        assertThat(requirement.getPriority()).isEqualTo(Requirement.PRIORITY_CRITICAL);
        assertThat(requirement.getStatus()).isEqualTo(Requirement.STATUS_IN_REVIEW);
        assertThat(requirement.getSourceDocumentId()).isEqualTo("doc-500");
        assertThat(requirement.getCurrentVersionId()).isEqualTo("ver-001");
    }

    @Test
    @DisplayName("Should update status and timestamp through setters")
    void shouldUpdateStatusAndFields() {
        Requirement requirement = new Requirement();
        requirement.setId("req-003");
        requirement.setProjectId("proj-100");
        requirement.setRequirementKey("REQ-002");
        requirement.setTitle("Audit Logging");
        requirement.setDescription("Log all security-sensitive operations.");
        requirement.setType(Requirement.TYPE_FUNCTIONAL);
        requirement.setPriority(Requirement.PRIORITY_HIGH);
        requirement.setStatus(Requirement.STATUS_DRAFT);

        assertThat(requirement.getStatus()).isEqualTo(Requirement.STATUS_DRAFT);

        // Transition through lifecycle statuses
        requirement.setStatus(Requirement.STATUS_IN_REVIEW);
        assertThat(requirement.getStatus()).isEqualTo(Requirement.STATUS_IN_REVIEW);

        requirement.setStatus(Requirement.STATUS_APPROVED);
        assertThat(requirement.getStatus()).isEqualTo(Requirement.STATUS_APPROVED);

        requirement.setStatus(Requirement.STATUS_REJECTED);
        assertThat(requirement.getStatus()).isEqualTo(Requirement.STATUS_REJECTED);

        requirement.setStatus(Requirement.STATUS_DEPRECATED);
        assertThat(requirement.getStatus()).isEqualTo(Requirement.STATUS_DEPRECATED);
    }

    @Test
    @DisplayName("Should verify all constant values")
    void shouldVerifyConstants() {
        // Types
        assertThat(Requirement.TYPE_FUNCTIONAL).isEqualTo("FUNCTIONAL");
        assertThat(Requirement.TYPE_NON_FUNCTIONAL).isEqualTo("NON_FUNCTIONAL");

        // Priorities
        assertThat(Requirement.PRIORITY_LOW).isEqualTo("LOW");
        assertThat(Requirement.PRIORITY_MEDIUM).isEqualTo("MEDIUM");
        assertThat(Requirement.PRIORITY_HIGH).isEqualTo("HIGH");
        assertThat(Requirement.PRIORITY_CRITICAL).isEqualTo("CRITICAL");

        // Statuses
        assertThat(Requirement.STATUS_DRAFT).isEqualTo("DRAFT");
        assertThat(Requirement.STATUS_IN_REVIEW).isEqualTo("IN_REVIEW");
        assertThat(Requirement.STATUS_APPROVED).isEqualTo("APPROVED");
        assertThat(Requirement.STATUS_REJECTED).isEqualTo("REJECTED");
        assertThat(Requirement.STATUS_DEPRECATED).isEqualTo("DEPRECATED");
    }
}
