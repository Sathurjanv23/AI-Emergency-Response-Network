package com.nova.emergency.repository;

import com.nova.emergency.model.TraceabilityArtifactType;
import com.nova.emergency.model.TraceabilityLink;
import com.nova.emergency.model.TraceabilityLinkStatus;
import com.nova.emergency.model.TraceabilityLinkType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TraceabilityLinkRepositoryTest {

    @Mock
    private TraceabilityLinkRepository repository;

    private TraceabilityLink activeLink;
    private TraceabilityLink inactiveLink;
    private TraceabilityLink relatedLink;

    @BeforeEach
    void setUp() {
        String now = Instant.now().toString();

        activeLink = TraceabilityLink.builder()
                .id("link-001")
                .projectId("proj-100")
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-101")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-102")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .status(TraceabilityLinkStatus.ACTIVE)
                .description("req-101 depends on core auth in req-102")
                .createdBy("user-001")
                .createdAt(now)
                .updatedAt(now)
                .build();

        inactiveLink = TraceabilityLink.builder()
                .id("link-002")
                .projectId("proj-100")
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-101")
                .targetArtifactType(TraceabilityArtifactType.TEST_CASE)
                .targetArtifactId("tc-501")
                .linkType(TraceabilityLinkType.VERIFIED_BY)
                .status(TraceabilityLinkStatus.INACTIVE)
                .description("Deprecated test case association")
                .createdBy("user-001")
                .createdAt(now)
                .updatedAt(now)
                .build();

        relatedLink = TraceabilityLink.builder()
                .id("link-003")
                .projectId("proj-100")
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-102")
                .targetArtifactType(TraceabilityArtifactType.CODE_REFERENCE)
                .targetArtifactId("com.nova.auth.TokenService")
                .linkType(TraceabilityLinkType.IMPLEMENTED_BY)
                .status(TraceabilityLinkStatus.ACTIVE)
                .description("TokenService implements authentication requirement")
                .createdBy("user-002")
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    // =========================================================================
    // 1. Project-Scoped ID Lookup & Existence
    // =========================================================================

    @Test
    @DisplayName("Should find link by ID and project ID")
    void shouldFindByIdAndProjectId() {
        when(repository.findByIdAndProjectId("link-001", "proj-100"))
                .thenReturn(Optional.of(activeLink));

        Optional<TraceabilityLink> found = repository.findByIdAndProjectId("link-001", "proj-100");

        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo("link-001");
        assertThat(found.get().getProjectId()).isEqualTo("proj-100");
        assertThat(found.get().getLinkType()).isEqualTo(TraceabilityLinkType.DEPENDS_ON);
        verify(repository, times(1)).findByIdAndProjectId("link-001", "proj-100");
    }

    @Test
    @DisplayName("Should return empty when link exists in another project (Project Isolation)")
    void shouldEnforceProjectIsolationOnLookup() {
        when(repository.findByIdAndProjectId("link-001", "proj-other"))
                .thenReturn(Optional.empty());

        Optional<TraceabilityLink> found = repository.findByIdAndProjectId("link-001", "proj-other");

        assertThat(found).isEmpty();
        verify(repository, times(1)).findByIdAndProjectId("link-001", "proj-other");
    }

    @Test
    @DisplayName("Should check existence by ID and project ID")
    void shouldCheckExistsByIdAndProjectId() {
        when(repository.existsByIdAndProjectId("link-001", "proj-100")).thenReturn(true);
        when(repository.existsByIdAndProjectId("link-001", "proj-999")).thenReturn(false);

        assertThat(repository.existsByIdAndProjectId("link-001", "proj-100")).isTrue();
        assertThat(repository.existsByIdAndProjectId("link-001", "proj-999")).isFalse();
    }

    // =========================================================================
    // 2. Project-Scoped Collection Queries & Status Filtering
    // =========================================================================

    @Test
    @DisplayName("Should find links by project ID ordered by creation time descending")
    void shouldFindByProjectIdOrderByCreatedAtDesc() {
        when(repository.findByProjectIdOrderByCreatedAtDesc("proj-100"))
                .thenReturn(List.of(relatedLink, inactiveLink, activeLink));

        List<TraceabilityLink> links = repository.findByProjectIdOrderByCreatedAtDesc("proj-100");

        assertThat(links).hasSize(3);
        assertThat(links.get(0).getId()).isEqualTo("link-003");
        verify(repository, times(1)).findByProjectIdOrderByCreatedAtDesc("proj-100");
    }

    @Test
    @DisplayName("Should filter links by project ID and status (ACTIVE / INACTIVE)")
    void shouldFindByProjectIdAndStatus() {
        when(repository.findByProjectIdAndStatus("proj-100", TraceabilityLinkStatus.ACTIVE))
                .thenReturn(List.of(activeLink, relatedLink));
        when(repository.findByProjectIdAndStatus("proj-100", TraceabilityLinkStatus.INACTIVE))
                .thenReturn(List.of(inactiveLink));

        List<TraceabilityLink> activeLinks = repository.findByProjectIdAndStatus("proj-100", TraceabilityLinkStatus.ACTIVE);
        List<TraceabilityLink> inactiveLinks = repository.findByProjectIdAndStatus("proj-100", TraceabilityLinkStatus.INACTIVE);

        assertThat(activeLinks).hasSize(2);
        assertThat(activeLinks).allMatch(l -> l.getStatus() == TraceabilityLinkStatus.ACTIVE);

        assertThat(inactiveLinks).hasSize(1);
        assertThat(inactiveLinks.get(0).getId()).isEqualTo("link-002");
        assertThat(inactiveLinks.get(0).getStatus()).isEqualTo(TraceabilityLinkStatus.INACTIVE);
    }

    // =========================================================================
    // 3. Outgoing Relationships (Originating from Source Artifact)
    // =========================================================================

    @Test
    @DisplayName("Should find outgoing relationships originating from source artifact")
    void shouldFindOutgoingRelationships() {
        when(repository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactId(
                "proj-100", TraceabilityArtifactType.REQUIREMENT, "req-101"))
                .thenReturn(List.of(activeLink, inactiveLink));

        List<TraceabilityLink> outgoing = repository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactId(
                "proj-100", TraceabilityArtifactType.REQUIREMENT, "req-101");

        assertThat(outgoing).hasSize(2);
        assertThat(outgoing).allMatch(l -> l.getSourceArtifactId().equals("req-101"));
    }

    @Test
    @DisplayName("Should find outgoing relationships filtered by status")
    void shouldFindOutgoingRelationshipsFilteredByStatus() {
        when(repository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndStatus(
                "proj-100", TraceabilityArtifactType.REQUIREMENT, "req-101", TraceabilityLinkStatus.ACTIVE))
                .thenReturn(List.of(activeLink));

        List<TraceabilityLink> activeOutgoing = repository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndStatus(
                "proj-100", TraceabilityArtifactType.REQUIREMENT, "req-101", TraceabilityLinkStatus.ACTIVE);

        assertThat(activeOutgoing).hasSize(1);
        assertThat(activeOutgoing.get(0).getId()).isEqualTo("link-001");
        assertThat(activeOutgoing.get(0).getStatus()).isEqualTo(TraceabilityLinkStatus.ACTIVE);
    }

    // =========================================================================
    // 4. Incoming Relationships (Reverse Traceability)
    // =========================================================================

    @Test
    @DisplayName("Should find incoming relationships terminating at target artifact")
    void shouldFindIncomingRelationships() {
        when(repository.findByProjectIdAndTargetArtifactTypeAndTargetArtifactId(
                "proj-100", TraceabilityArtifactType.REQUIREMENT, "req-102"))
                .thenReturn(List.of(activeLink));

        List<TraceabilityLink> incoming = repository.findByProjectIdAndTargetArtifactTypeAndTargetArtifactId(
                "proj-100", TraceabilityArtifactType.REQUIREMENT, "req-102");

        assertThat(incoming).hasSize(1);
        assertThat(incoming.get(0).getTargetArtifactId()).isEqualTo("req-102");
        assertThat(incoming.get(0).getSourceArtifactId()).isEqualTo("req-101");
    }

    @Test
    @DisplayName("Should find incoming relationships filtered by status")
    void shouldFindIncomingRelationshipsFilteredByStatus() {
        when(repository.findByProjectIdAndTargetArtifactTypeAndTargetArtifactIdAndStatus(
                "proj-100", TraceabilityArtifactType.REQUIREMENT, "req-102", TraceabilityLinkStatus.ACTIVE))
                .thenReturn(List.of(activeLink));

        List<TraceabilityLink> activeIncoming = repository.findByProjectIdAndTargetArtifactTypeAndTargetArtifactIdAndStatus(
                "proj-100", TraceabilityArtifactType.REQUIREMENT, "req-102", TraceabilityLinkStatus.ACTIVE);

        assertThat(activeIncoming).hasSize(1);
        assertThat(activeIncoming.get(0).getId()).isEqualTo("link-001");
    }

    // =========================================================================
    // 5. Relationship Type Filtering
    // =========================================================================

    @Test
    @DisplayName("Should find links by project ID and link type")
    void shouldFindByProjectIdAndLinkType() {
        when(repository.findByProjectIdAndLinkType("proj-100", TraceabilityLinkType.DEPENDS_ON))
                .thenReturn(List.of(activeLink));

        List<TraceabilityLink> dependsOnLinks = repository.findByProjectIdAndLinkType("proj-100", TraceabilityLinkType.DEPENDS_ON);

        assertThat(dependsOnLinks).hasSize(1);
        assertThat(dependsOnLinks.get(0).getLinkType()).isEqualTo(TraceabilityLinkType.DEPENDS_ON);
    }

    @Test
    @DisplayName("Should find links by project ID, link type, and status")
    void shouldFindByProjectIdAndLinkTypeAndStatus() {
        when(repository.findByProjectIdAndLinkTypeAndStatus(
                "proj-100", TraceabilityLinkType.VERIFIED_BY, TraceabilityLinkStatus.INACTIVE))
                .thenReturn(List.of(inactiveLink));

        List<TraceabilityLink> filtered = repository.findByProjectIdAndLinkTypeAndStatus(
                "proj-100", TraceabilityLinkType.VERIFIED_BY, TraceabilityLinkStatus.INACTIVE);

        assertThat(filtered).hasSize(1);
        assertThat(filtered.get(0).getId()).isEqualTo("link-002");
        assertThat(filtered.get(0).getStatus()).isEqualTo(TraceabilityLinkStatus.INACTIVE);
    }

    // =========================================================================
    // 6. Logical Relationship Identity Lookup (WITHOUT Status)
    // =========================================================================

    @Test
    @DisplayName("Should find logical relationship without status (supporting ACTIVE documents)")
    void shouldFindLogicalRelationshipActive() {
        when(repository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndTargetArtifactTypeAndTargetArtifactIdAndLinkType(
                "proj-100",
                TraceabilityArtifactType.REQUIREMENT,
                "req-101",
                TraceabilityArtifactType.REQUIREMENT,
                "req-102",
                TraceabilityLinkType.DEPENDS_ON))
                .thenReturn(Optional.of(activeLink));

        Optional<TraceabilityLink> found = repository
                .findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndTargetArtifactTypeAndTargetArtifactIdAndLinkType(
                        "proj-100",
                        TraceabilityArtifactType.REQUIREMENT,
                        "req-101",
                        TraceabilityArtifactType.REQUIREMENT,
                        "req-102",
                        TraceabilityLinkType.DEPENDS_ON);

        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo("link-001");
        assertThat(found.get().getStatus()).isEqualTo(TraceabilityLinkStatus.ACTIVE);
    }

    @Test
    @DisplayName("Should find logical relationship without status (supporting INACTIVE documents for reactivation)")
    void shouldFindLogicalRelationshipInactive() {
        when(repository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndTargetArtifactTypeAndTargetArtifactIdAndLinkType(
                "proj-100",
                TraceabilityArtifactType.REQUIREMENT,
                "req-101",
                TraceabilityArtifactType.TEST_CASE,
                "tc-501",
                TraceabilityLinkType.VERIFIED_BY))
                .thenReturn(Optional.of(inactiveLink));

        Optional<TraceabilityLink> found = repository
                .findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndTargetArtifactTypeAndTargetArtifactIdAndLinkType(
                        "proj-100",
                        TraceabilityArtifactType.REQUIREMENT,
                        "req-101",
                        TraceabilityArtifactType.TEST_CASE,
                        "tc-501",
                        TraceabilityLinkType.VERIFIED_BY);

        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo("link-002");
        assertThat(found.get().getStatus()).isEqualTo(TraceabilityLinkStatus.INACTIVE);
    }

    @Test
    @DisplayName("Should check logical relationship existence without status")
    void shouldCheckLogicalRelationshipExistence() {
        when(repository.existsByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndTargetArtifactTypeAndTargetArtifactIdAndLinkType(
                "proj-100",
                TraceabilityArtifactType.REQUIREMENT,
                "req-101",
                TraceabilityArtifactType.REQUIREMENT,
                "req-102",
                TraceabilityLinkType.DEPENDS_ON)).thenReturn(true);

        when(repository.existsByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndTargetArtifactTypeAndTargetArtifactIdAndLinkType(
                "proj-100",
                TraceabilityArtifactType.REQUIREMENT,
                "req-999",
                TraceabilityArtifactType.REQUIREMENT,
                "req-888",
                TraceabilityLinkType.BLOCKS)).thenReturn(false);

        boolean exists = repository.existsByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndTargetArtifactTypeAndTargetArtifactIdAndLinkType(
                "proj-100",
                TraceabilityArtifactType.REQUIREMENT,
                "req-101",
                TraceabilityArtifactType.REQUIREMENT,
                "req-102",
                TraceabilityLinkType.DEPENDS_ON);
        assertThat(exists).isTrue();

        boolean nonExistent = repository.existsByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndTargetArtifactTypeAndTargetArtifactIdAndLinkType(
                "proj-100",
                TraceabilityArtifactType.REQUIREMENT,
                "req-999",
                TraceabilityArtifactType.REQUIREMENT,
                "req-888",
                TraceabilityLinkType.BLOCKS);
        assertThat(nonExistent).isFalse();
    }

    // =========================================================================
    // 7. Pagination Support
    // =========================================================================

    @Test
    @DisplayName("Should support pagination for project-scoped links")
    void shouldSupportPagination() {
        Pageable pageable = PageRequest.of(0, 2);
        Page<TraceabilityLink> page = new PageImpl<>(List.of(activeLink, relatedLink), pageable, 3);

        when(repository.findByProjectId("proj-100", pageable)).thenReturn(page);

        Page<TraceabilityLink> resultPage = repository.findByProjectId("proj-100", pageable);

        assertThat(resultPage).isNotNull();
        assertThat(resultPage.getContent()).hasSize(2);
        assertThat(resultPage.getTotalElements()).isEqualTo(3);
        assertThat(resultPage.getTotalPages()).isEqualTo(2);
        verify(repository, times(1)).findByProjectId("proj-100", pageable);
    }

    // =========================================================================
    // 8. Count and Delete Operations
    // =========================================================================

    @Test
    @DisplayName("Should support count and delete operations")
    void shouldSupportCountAndDelete() {
        when(repository.countByProjectId("proj-100")).thenReturn(3L);
        when(repository.countByProjectIdAndStatus("proj-100", TraceabilityLinkStatus.ACTIVE)).thenReturn(2L);
        doNothing().when(repository).deleteByIdAndProjectId("link-001", "proj-100");

        assertThat(repository.countByProjectId("proj-100")).isEqualTo(3L);
        assertThat(repository.countByProjectIdAndStatus("proj-100", TraceabilityLinkStatus.ACTIVE)).isEqualTo(2L);

        repository.deleteByIdAndProjectId("link-001", "proj-100");
        verify(repository, times(1)).deleteByIdAndProjectId("link-001", "proj-100");
    }
}
