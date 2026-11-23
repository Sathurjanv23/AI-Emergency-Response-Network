package com.nova.emergency.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TraceabilityLinkModelTest {

    @Test
    @DisplayName("Should create TraceabilityLink with builder and default values")
    void shouldCreateTraceabilityLinkWithDefaults() {
        TraceabilityLink link = TraceabilityLink.builder()
                .id("link-001")
                .projectId("proj-100")
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-101")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-102")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .description("REQ-101 requires REQ-102 for auth session handling")
                .createdBy("januka-karunakaran")
                .build();

        assertThat(link.getId()).isEqualTo("link-001");
        assertThat(link.getProjectId()).isEqualTo("proj-100");
        assertThat(link.getSourceArtifactType()).isEqualTo(TraceabilityArtifactType.REQUIREMENT);
        assertThat(link.getSourceArtifactId()).isEqualTo("req-101");
        assertThat(link.getTargetArtifactType()).isEqualTo(TraceabilityArtifactType.REQUIREMENT);
        assertThat(link.getTargetArtifactId()).isEqualTo("req-102");
        assertThat(link.getLinkType()).isEqualTo(TraceabilityLinkType.DEPENDS_ON);
        assertThat(link.getStatus()).isEqualTo(TraceabilityLinkStatus.ACTIVE);
        assertThat(link.getDescription()).isEqualTo("REQ-101 requires REQ-102 for auth session handling");
        assertThat(link.getCreatedBy()).isEqualTo("januka-karunakaran");
        assertThat(link.getCreatedAt()).isNotNull();
        assertThat(link.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("Should create TraceabilityLink across different artifact types (Requirement to Test Case)")
    void shouldCreateLinkAcrossArtifactTypes() {
        String now = Instant.now().toString();

        TraceabilityLink link = TraceabilityLink.builder()
                .id("link-002")
                .projectId("proj-100")
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-200")
                .targetArtifactType(TraceabilityArtifactType.TEST_CASE)
                .targetArtifactId("tc-501")
                .linkType(TraceabilityLinkType.VERIFIED_BY)
                .status(TraceabilityLinkStatus.ACTIVE)
                .description("Automated regression test verifying OAuth callback")
                .createdBy("januka-karunakaran")
                .createdAt(now)
                .updatedAt(now)
                .build();

        assertThat(link.getSourceArtifactType()).isEqualTo(TraceabilityArtifactType.REQUIREMENT);
        assertThat(link.getTargetArtifactType()).isEqualTo(TraceabilityArtifactType.TEST_CASE);
        assertThat(link.getLinkType()).isEqualTo(TraceabilityLinkType.VERIFIED_BY);
        assertThat(link.getStatus().isActive()).isTrue();
    }

    @Test
    @DisplayName("Should create TraceabilityLink to code and GitHub artifacts (Implemented By)")
    void shouldCreateLinkToCodeArtifacts() {
        TraceabilityLink linkCommit = TraceabilityLink.builder()
                .id("link-003")
                .projectId("proj-100")
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-300")
                .targetArtifactType(TraceabilityArtifactType.GITHUB_COMMIT)
                .targetArtifactId("commit-abc1234")
                .linkType(TraceabilityLinkType.IMPLEMENTED_BY)
                .status(TraceabilityLinkStatus.ACTIVE)
                .description("Initial implementation commit")
                .createdBy("januka-karunakaran")
                .build();

        TraceabilityLink linkPR = TraceabilityLink.builder()
                .id("link-004")
                .projectId("proj-100")
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-300")
                .targetArtifactType(TraceabilityArtifactType.GITHUB_PULL_REQUEST)
                .targetArtifactId("pr-26")
                .linkType(TraceabilityLinkType.IMPLEMENTED_BY)
                .status(TraceabilityLinkStatus.ACTIVE)
                .description("Pull Request implementing Requirement")
                .createdBy("januka-karunakaran")
                .build();

        TraceabilityLink linkCode = TraceabilityLink.builder()
                .id("link-005")
                .projectId("proj-100")
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-300")
                .targetArtifactType(TraceabilityArtifactType.CODE_REFERENCE)
                .targetArtifactId("com.nova.emergency.service.AuthService")
                .linkType(TraceabilityLinkType.IMPLEMENTED_BY)
                .status(TraceabilityLinkStatus.ACTIVE)
                .description("Class implementing auth requirement")
                .createdBy("januka-karunakaran")
                .build();

        assertThat(linkCommit.getTargetArtifactType()).isEqualTo(TraceabilityArtifactType.GITHUB_COMMIT);
        assertThat(linkPR.getTargetArtifactType()).isEqualTo(TraceabilityArtifactType.GITHUB_PULL_REQUEST);
        assertThat(linkCode.getTargetArtifactType()).isEqualTo(TraceabilityArtifactType.CODE_REFERENCE);
    }

    @Test
    @DisplayName("Should support setters, getters, and status mutation (soft-delete / reactivation)")
    void shouldSupportSettersAndStatusMutation() {
        TraceabilityLink link = new TraceabilityLink();
        link.setId("link-010");
        link.setProjectId("proj-100");
        link.setSourceArtifactType(TraceabilityArtifactType.REQUIREMENT);
        link.setSourceArtifactId("req-001");
        link.setTargetArtifactType(TraceabilityArtifactType.REQUIREMENT);
        link.setTargetArtifactId("req-002");
        link.setLinkType(TraceabilityLinkType.BLOCKS);
        link.setStatus(TraceabilityLinkStatus.ACTIVE);
        link.setDescription("REQ-001 blocks deployment of REQ-002");
        link.setCreatedBy("januka-karunakaran");

        String time1 = Instant.now().toString();
        link.setCreatedAt(time1);
        link.setUpdatedAt(time1);

        assertThat(link.getStatus()).isEqualTo(TraceabilityLinkStatus.ACTIVE);
        assertThat(link.getStatus().isActive()).isTrue();

        // Soft-delete / deactivate link
        link.setStatus(TraceabilityLinkStatus.INACTIVE);
        String time2 = Instant.now().toString();
        link.setUpdatedAt(time2);

        assertThat(link.getStatus()).isEqualTo(TraceabilityLinkStatus.INACTIVE);
        assertThat(link.getStatus().isActive()).isFalse();

        // Reactivate
        link.setStatus(TraceabilityLinkStatus.ACTIVE);
        assertThat(link.getStatus().isActive()).isTrue();
    }

    @Test
    @DisplayName("Should parse TraceabilityArtifactType from string case-insensitively")
    void shouldParseTraceabilityArtifactType() {
        assertThat(TraceabilityArtifactType.fromString("REQUIREMENT")).isEqualTo(TraceabilityArtifactType.REQUIREMENT);
        assertThat(TraceabilityArtifactType.fromString("requirement")).isEqualTo(TraceabilityArtifactType.REQUIREMENT);
        assertThat(TraceabilityArtifactType.fromString("TEST_CASE")).isEqualTo(TraceabilityArtifactType.TEST_CASE);
        assertThat(TraceabilityArtifactType.fromString("test_case")).isEqualTo(TraceabilityArtifactType.TEST_CASE);
        assertThat(TraceabilityArtifactType.fromString("CODE_REFERENCE")).isEqualTo(TraceabilityArtifactType.CODE_REFERENCE);
        assertThat(TraceabilityArtifactType.fromString("GITHUB_COMMIT")).isEqualTo(TraceabilityArtifactType.GITHUB_COMMIT);
        assertThat(TraceabilityArtifactType.fromString("GITHUB_PULL_REQUEST")).isEqualTo(TraceabilityArtifactType.GITHUB_PULL_REQUEST);
        assertThat(TraceabilityArtifactType.fromString(null)).isNull();
        assertThat(TraceabilityArtifactType.fromString("   ")).isNull();

        assertThatThrownBy(() -> TraceabilityArtifactType.fromString("INVALID_ARTIFACT"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unknown traceability artifact type: INVALID_ARTIFACT");
    }

    @Test
    @DisplayName("Should parse TraceabilityLinkType from string case-insensitively")
    void shouldParseTraceabilityLinkType() {
        assertThat(TraceabilityLinkType.fromString("DEPENDS_ON")).isEqualTo(TraceabilityLinkType.DEPENDS_ON);
        assertThat(TraceabilityLinkType.fromString("depends_on")).isEqualTo(TraceabilityLinkType.DEPENDS_ON);
        assertThat(TraceabilityLinkType.fromString("RELATED_TO")).isEqualTo(TraceabilityLinkType.RELATED_TO);
        assertThat(TraceabilityLinkType.fromString("IMPLEMENTED_BY")).isEqualTo(TraceabilityLinkType.IMPLEMENTED_BY);
        assertThat(TraceabilityLinkType.fromString("VERIFIED_BY")).isEqualTo(TraceabilityLinkType.VERIFIED_BY);
        assertThat(TraceabilityLinkType.fromString("BLOCKS")).isEqualTo(TraceabilityLinkType.BLOCKS);
        assertThat(TraceabilityLinkType.fromString(null)).isNull();
        assertThat(TraceabilityLinkType.fromString("  ")).isNull();

        assertThatThrownBy(() -> TraceabilityLinkType.fromString("UNKNOWN_LINK"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unknown traceability link type: UNKNOWN_LINK");
    }

    @Test
    @DisplayName("Should parse TraceabilityLinkStatus from string case-insensitively")
    void shouldParseTraceabilityLinkStatus() {
        assertThat(TraceabilityLinkStatus.fromString("ACTIVE")).isEqualTo(TraceabilityLinkStatus.ACTIVE);
        assertThat(TraceabilityLinkStatus.fromString("active")).isEqualTo(TraceabilityLinkStatus.ACTIVE);
        assertThat(TraceabilityLinkStatus.fromString("INACTIVE")).isEqualTo(TraceabilityLinkStatus.INACTIVE);
        assertThat(TraceabilityLinkStatus.fromString("inactive")).isEqualTo(TraceabilityLinkStatus.INACTIVE);
        assertThat(TraceabilityLinkStatus.fromString(null)).isNull();
        assertThat(TraceabilityLinkStatus.fromString("  ")).isNull();

        assertThatThrownBy(() -> TraceabilityLinkStatus.fromString("SUSPENDED"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unknown traceability link status: SUSPENDED");
    }

    @Test
    @DisplayName("Should verify model string constants")
    void shouldVerifyConstants() {
        assertThat(TraceabilityLink.STATUS_ACTIVE).isEqualTo("ACTIVE");
        assertThat(TraceabilityLink.STATUS_INACTIVE).isEqualTo("INACTIVE");

        assertThat(TraceabilityLink.TYPE_DEPENDS_ON).isEqualTo("DEPENDS_ON");
        assertThat(TraceabilityLink.TYPE_RELATED_TO).isEqualTo("RELATED_TO");
        assertThat(TraceabilityLink.TYPE_IMPLEMENTED_BY).isEqualTo("IMPLEMENTED_BY");
        assertThat(TraceabilityLink.TYPE_VERIFIED_BY).isEqualTo("VERIFIED_BY");
        assertThat(TraceabilityLink.TYPE_BLOCKS).isEqualTo("BLOCKS");

        assertThat(TraceabilityLink.ARTIFACT_REQUIREMENT).isEqualTo("REQUIREMENT");
        assertThat(TraceabilityLink.ARTIFACT_TEST_CASE).isEqualTo("TEST_CASE");
        assertThat(TraceabilityLink.ARTIFACT_CODE_REFERENCE).isEqualTo("CODE_REFERENCE");
        assertThat(TraceabilityLink.ARTIFACT_GITHUB_COMMIT).isEqualTo("GITHUB_COMMIT");
        assertThat(TraceabilityLink.ARTIFACT_GITHUB_PULL_REQUEST).isEqualTo("GITHUB_PULL_REQUEST");
    }

    @Test
    @DisplayName("Should verify Document collection and CompoundIndex annotations (without status in unique index)")
    void shouldVerifyAnnotations() {
        Document docAnnotation = TraceabilityLink.class.getAnnotation(Document.class);
        assertThat(docAnnotation).isNotNull();
        assertThat(docAnnotation.collection()).isEqualTo("traceability_links");

        CompoundIndexes compoundIndexes = TraceabilityLink.class.getAnnotation(CompoundIndexes.class);
        assertThat(compoundIndexes).isNotNull();

        CompoundIndex[] indexes = compoundIndexes.value();
        assertThat(indexes).hasSize(4);

        boolean hasProjectSourceIdx = Arrays.stream(indexes)
                .anyMatch(idx -> "project_source_idx".equals(idx.name()) &&
                        "{'projectId': 1, 'sourceArtifactType': 1, 'sourceArtifactId': 1}".equals(idx.def()));
        assertThat(hasProjectSourceIdx).isTrue();

        boolean hasProjectTargetIdx = Arrays.stream(indexes)
                .anyMatch(idx -> "project_target_idx".equals(idx.name()) &&
                        "{'projectId': 1, 'targetArtifactType': 1, 'targetArtifactId': 1}".equals(idx.def()));
        assertThat(hasProjectTargetIdx).isTrue();

        boolean hasProjectStatusIdx = Arrays.stream(indexes)
                .anyMatch(idx -> "project_status_idx".equals(idx.name()) &&
                        "{'projectId': 1, 'status': 1}".equals(idx.def()));
        assertThat(hasProjectStatusIdx).isTrue();

        // Unique index must NOT include status (one document per logical relationship with ACTIVE/INACTIVE updates)
        boolean hasUniqueIdx = Arrays.stream(indexes)
                .anyMatch(idx -> "project_source_target_type_unique_idx".equals(idx.name()) &&
                        "{'projectId': 1, 'sourceArtifactType': 1, 'sourceArtifactId': 1, 'targetArtifactType': 1, 'targetArtifactId': 1, 'linkType': 1}".equals(idx.def()) &&
                        idx.unique());
        assertThat(hasUniqueIdx).isTrue();

        Arrays.stream(indexes)
                .filter(CompoundIndex::unique)
                .forEach(idx -> assertThat(idx.def()).doesNotContain("'status'"));
    }
}
