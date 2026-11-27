package com.nova.emergency.dto;

import com.nova.emergency.model.TraceabilityArtifactType;
import com.nova.emergency.model.TraceabilityLink;
import com.nova.emergency.model.TraceabilityLinkStatus;
import com.nova.emergency.model.TraceabilityLinkType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class TraceabilityLinkResponseTest {

    @Test
    @DisplayName("Should map entity to response DTO accurately with all fields")
    void shouldMapEntityToResponseAccurately() {
        String createdAt = Instant.parse("2026-11-20T10:15:30Z").toString();
        String updatedAt = Instant.parse("2026-11-20T11:20:45Z").toString();

        TraceabilityLink link = TraceabilityLink.builder()
                .id("link-789")
                .projectId("proj-100")
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-001")
                .targetArtifactType(TraceabilityArtifactType.CODE_REFERENCE)
                .targetArtifactId("src/main/auth/TokenProvider.java")
                .linkType(TraceabilityLinkType.IMPLEMENTED_BY)
                .status(TraceabilityLinkStatus.ACTIVE)
                .description("TokenProvider implements requirement req-001")
                .createdBy("user-456")
                .createdAt(createdAt)
                .updatedAt(updatedAt)
                .build();

        TraceabilityLinkResponse response = TraceabilityLinkResponse.from(link);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo("link-789");
        assertThat(response.getProjectId()).isEqualTo("proj-100");
        assertThat(response.getSourceArtifactType()).isEqualTo(TraceabilityArtifactType.REQUIREMENT);
        assertThat(response.getSourceArtifactId()).isEqualTo("req-001");
        assertThat(response.getTargetArtifactType()).isEqualTo(TraceabilityArtifactType.CODE_REFERENCE);
        assertThat(response.getTargetArtifactId()).isEqualTo("src/main/auth/TokenProvider.java");
        assertThat(response.getLinkType()).isEqualTo(TraceabilityLinkType.IMPLEMENTED_BY);
        assertThat(response.getStatus()).isEqualTo(TraceabilityLinkStatus.ACTIVE);
        assertThat(response.getDescription()).isEqualTo("TokenProvider implements requirement req-001");
        assertThat(response.getCreatedBy()).isEqualTo("user-456");
        assertThat(response.getCreatedAt()).isEqualTo(createdAt);
        assertThat(response.getUpdatedAt()).isEqualTo(updatedAt);
    }

    @Test
    @DisplayName("Should handle null optional description accurately")
    void shouldHandleNullOptionalDescription() {
        TraceabilityLink link = TraceabilityLink.builder()
                .id("link-101")
                .projectId("proj-100")
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-001")
                .targetArtifactType(TraceabilityArtifactType.TEST_CASE)
                .targetArtifactId("tc-005")
                .linkType(TraceabilityLinkType.VERIFIED_BY)
                .status(TraceabilityLinkStatus.INACTIVE)
                .description(null)
                .createdBy("user-123")
                .createdAt("2026-11-20T10:00:00Z")
                .updatedAt("2026-11-20T10:00:00Z")
                .build();

        TraceabilityLinkResponse response = TraceabilityLinkResponse.from(link);

        assertThat(response).isNotNull();
        assertThat(response.getDescription()).isNull();
        assertThat(response.getStatus()).isEqualTo(TraceabilityLinkStatus.INACTIVE);
    }

    @Test
    @DisplayName("Should return null when source entity is null")
    void shouldReturnNullForNullEntity() {
        assertThat(TraceabilityLinkResponse.from(null)).isNull();
        assertThat(TraceabilityLinkResponse.fromEntity(null)).isNull();
    }

    @Test
    @DisplayName("Should produce identical output using fromEntity factory method")
    void shouldProduceIdenticalOutputWithFromEntity() {
        TraceabilityLink link = TraceabilityLink.builder()
                .id("link-202")
                .projectId("proj-100")
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-002")
                .targetArtifactType(TraceabilityArtifactType.GITHUB_PULL_REQUEST)
                .targetArtifactId("PR-42")
                .linkType(TraceabilityLinkType.IMPLEMENTED_BY)
                .status(TraceabilityLinkStatus.ACTIVE)
                .description("PR-42 implements req-002")
                .createdBy("user-789")
                .createdAt("2026-11-20T12:00:00Z")
                .updatedAt("2026-11-20T12:00:00Z")
                .build();

        TraceabilityLinkResponse fromMethod = TraceabilityLinkResponse.from(link);
        TraceabilityLinkResponse fromEntityMethod = TraceabilityLinkResponse.fromEntity(link);

        assertThat(fromMethod).isEqualTo(fromEntityMethod);
    }

    @Test
    @DisplayName("Should guarantee that mapping does not mutate the source entity")
    void shouldNotMutateSourceEntity() {
        String originalDescription = "Original description before mapping";
        TraceabilityLink link = TraceabilityLink.builder()
                .id("link-immutable")
                .projectId("proj-100")
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-003")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-004")
                .linkType(TraceabilityLinkType.BLOCKS)
                .status(TraceabilityLinkStatus.ACTIVE)
                .description(originalDescription)
                .createdBy("user-001")
                .createdAt("2026-11-20T14:00:00Z")
                .updatedAt("2026-11-20T14:00:00Z")
                .build();

        // Perform mapping
        TraceabilityLinkResponse response = TraceabilityLinkResponse.from(link);
        assertThat(response).isNotNull();

        // Verify source entity fields remain untouched
        assertThat(link.getId()).isEqualTo("link-immutable");
        assertThat(link.getProjectId()).isEqualTo("proj-100");
        assertThat(link.getSourceArtifactType()).isEqualTo(TraceabilityArtifactType.REQUIREMENT);
        assertThat(link.getSourceArtifactId()).isEqualTo("req-003");
        assertThat(link.getTargetArtifactType()).isEqualTo(TraceabilityArtifactType.REQUIREMENT);
        assertThat(link.getTargetArtifactId()).isEqualTo("req-004");
        assertThat(link.getLinkType()).isEqualTo(TraceabilityLinkType.BLOCKS);
        assertThat(link.getStatus()).isEqualTo(TraceabilityLinkStatus.ACTIVE);
        assertThat(link.getDescription()).isEqualTo(originalDescription);
        assertThat(link.getCreatedBy()).isEqualTo("user-001");
        assertThat(link.getCreatedAt()).isEqualTo("2026-11-20T14:00:00Z");
        assertThat(link.getUpdatedAt()).isEqualTo("2026-11-20T14:00:00Z");
    }
}
