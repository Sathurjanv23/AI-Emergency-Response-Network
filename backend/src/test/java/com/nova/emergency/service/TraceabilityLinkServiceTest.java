package com.nova.emergency.service;

import com.nova.emergency.dto.CreateTraceabilityLinkRequest;
import com.nova.emergency.dto.TraceabilityLinkResponse;
import com.nova.emergency.dto.UpdateTraceabilityLinkRequest;
import com.nova.emergency.exception.ResourceNotFoundException;
import com.nova.emergency.model.*;
import com.nova.emergency.repository.ProjectRepository;
import com.nova.emergency.repository.RequirementRepository;
import com.nova.emergency.repository.TraceabilityLinkRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TraceabilityLinkServiceTest {

    @Mock
    private TraceabilityLinkRepository traceabilityLinkRepository;

    @Mock
    private RequirementRepository requirementRepository;

    @Mock
    private ProjectRepository projectRepository;

    @InjectMocks
    private TraceabilityLinkServiceImpl traceabilityLinkService;

    private Project testProject;
    private Requirement reqA;
    private Requirement reqB;
    private Requirement reqC;
    private TraceabilityLink sampleActiveLink;
    private TraceabilityLink sampleInactiveLink;

    @BeforeEach
    void setUp() {
        testProject = new Project();
        testProject.setId("proj-001");
        testProject.setOwnerId("user-123");

        reqA = Requirement.builder()
                .id("req-A")
                .projectId("proj-001")
                .requirementKey("REQ-001")
                .title("Authentication Feature")
                .description("User auth specification")
                .build();

        reqB = Requirement.builder()
                .id("req-B")
                .projectId("proj-001")
                .requirementKey("REQ-002")
                .title("Password Reset")
                .description("Password reset specification")
                .build();

        reqC = Requirement.builder()
                .id("req-C")
                .projectId("proj-001")
                .requirementKey("REQ-003")
                .title("Audit Logging")
                .description("Audit logging specification")
                .build();

        String now = Instant.now().toString();

        sampleActiveLink = TraceabilityLink.builder()
                .id("link-001")
                .projectId("proj-001")
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-A")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-B")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .status(TraceabilityLinkStatus.ACTIVE)
                .description("Initial auth dependency")
                .createdBy("user-123")
                .createdAt(now)
                .updatedAt(now)
                .build();

        sampleInactiveLink = TraceabilityLink.builder()
                .id("link-002")
                .projectId("proj-001")
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-A")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-B")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .status(TraceabilityLinkStatus.INACTIVE)
                .description("Deprecated dependency")
                .createdBy("user-123")
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    // =========================================================================
    // 1. Link Creation & Lifecycle Management
    // =========================================================================

    @Test
    @DisplayName("Should successfully create an ACTIVE traceability link when relationship does not exist")
    void testCreateLinkSuccess() {
        CreateTraceabilityLinkRequest request = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-A")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-B")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .description("Req-A depends on Req-B")
                .build();

        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(requirementRepository.findByIdAndProjectId("req-A", "proj-001")).thenReturn(Optional.of(reqA));
        when(requirementRepository.findByIdAndProjectId("req-B", "proj-001")).thenReturn(Optional.of(reqB));
        when(traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndTargetArtifactTypeAndTargetArtifactIdAndLinkType(
                "proj-001", TraceabilityArtifactType.REQUIREMENT, "req-A", TraceabilityArtifactType.REQUIREMENT, "req-B", TraceabilityLinkType.DEPENDS_ON))
                .thenReturn(Optional.empty());
        when(traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndStatus(
                "proj-001", TraceabilityArtifactType.REQUIREMENT, "req-B", TraceabilityLinkStatus.ACTIVE))
                .thenReturn(Collections.emptyList());
        when(traceabilityLinkRepository.save(any(TraceabilityLink.class))).thenAnswer(i -> {
            TraceabilityLink l = i.getArgument(0);
            l.setId("link-generated-001");
            return l;
        });

        TraceabilityLinkResponse response = traceabilityLinkService.createLink("proj-001", request, "user-123");

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo("link-generated-001");
        assertThat(response.getProjectId()).isEqualTo("proj-001");
        assertThat(response.getStatus()).isEqualTo(TraceabilityLinkStatus.ACTIVE);
        assertThat(response.getDescription()).isEqualTo("Req-A depends on Req-B");
        assertThat(response.getCreatedBy()).isEqualTo("user-123");
        verify(traceabilityLinkRepository, times(1)).save(any(TraceabilityLink.class));
    }

    @Test
    @DisplayName("Should reactivate an existing INACTIVE link in-place without creating a duplicate document")
    void testCreateLinkReactivatesInactive() {
        CreateTraceabilityLinkRequest request = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-A")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-B")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .description("Reactivated relationship with updated notes")
                .build();

        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(requirementRepository.findByIdAndProjectId("req-A", "proj-001")).thenReturn(Optional.of(reqA));
        when(requirementRepository.findByIdAndProjectId("req-B", "proj-001")).thenReturn(Optional.of(reqB));
        when(traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndTargetArtifactTypeAndTargetArtifactIdAndLinkType(
                "proj-001", TraceabilityArtifactType.REQUIREMENT, "req-A", TraceabilityArtifactType.REQUIREMENT, "req-B", TraceabilityLinkType.DEPENDS_ON))
                .thenReturn(Optional.of(sampleInactiveLink));
        when(traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndStatus(
                "proj-001", TraceabilityArtifactType.REQUIREMENT, "req-B", TraceabilityLinkStatus.ACTIVE))
                .thenReturn(Collections.emptyList());
        when(traceabilityLinkRepository.save(sampleInactiveLink)).thenReturn(sampleInactiveLink);

        TraceabilityLinkResponse response = traceabilityLinkService.createLink("proj-001", request, "user-123");

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo("link-002");
        assertThat(response.getStatus()).isEqualTo(TraceabilityLinkStatus.ACTIVE);
        assertThat(response.getDescription()).isEqualTo("Reactivated relationship with updated notes");
        assertThat(sampleInactiveLink.getStatus()).isEqualTo(TraceabilityLinkStatus.ACTIVE);
        verify(traceabilityLinkRepository, times(1)).save(sampleInactiveLink);
    }

    @Test
    @DisplayName("Should reject link creation when an ACTIVE relationship already exists")
    void testCreateLinkRejectsActiveDuplicate() {
        CreateTraceabilityLinkRequest request = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-A")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-B")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(requirementRepository.findByIdAndProjectId("req-A", "proj-001")).thenReturn(Optional.of(reqA));
        when(requirementRepository.findByIdAndProjectId("req-B", "proj-001")).thenReturn(Optional.of(reqB));
        when(traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndTargetArtifactTypeAndTargetArtifactIdAndLinkType(
                "proj-001", TraceabilityArtifactType.REQUIREMENT, "req-A", TraceabilityArtifactType.REQUIREMENT, "req-B", TraceabilityLinkType.DEPENDS_ON))
                .thenReturn(Optional.of(sampleActiveLink));

        assertThatThrownBy(() -> traceabilityLinkService.createLink("proj-001", request, "user-123"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("An active traceability link already exists for this logical relationship.");

        verify(traceabilityLinkRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should handle concurrent DuplicateKeyException during creation and rethrow IllegalStateException")
    void testCreateLinkConcurrentConflict() {
        CreateTraceabilityLinkRequest request = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-A")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-B")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(requirementRepository.findByIdAndProjectId("req-A", "proj-001")).thenReturn(Optional.of(reqA));
        when(requirementRepository.findByIdAndProjectId("req-B", "proj-001")).thenReturn(Optional.of(reqB));
        when(traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndTargetArtifactTypeAndTargetArtifactIdAndLinkType(
                any(), any(), any(), any(), any(), any())).thenReturn(Optional.empty());
        when(traceabilityLinkRepository.save(any(TraceabilityLink.class)))
                .thenThrow(new DuplicateKeyException("E11000 duplicate key error"));

        assertThatThrownBy(() -> traceabilityLinkService.createLink("proj-001", request, "user-123"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("A traceability link for this logical relationship was concurrently created. Please retry.");
    }

    // =========================================================================
    // 2. Business Validation & Constraint Checks
    // =========================================================================

    @Test
    @DisplayName("Should reject self-referencing traceability link")
    void testRejectSelfLink() {
        CreateTraceabilityLinkRequest request = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-A")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-A")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));

        assertThatThrownBy(() -> traceabilityLinkService.createLink("proj-001", request, "user-123"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Cannot create a self-referencing traceability link");
    }

    @Test
    @DisplayName("Should reject invalid artifact combinations for relationship types")
    void testRejectInvalidArtifactCombinations() {
        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));

        // DEPENDS_ON requires REQUIREMENT -> REQUIREMENT
        CreateTraceabilityLinkRequest req1 = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-A")
                .targetArtifactType(TraceabilityArtifactType.CODE_REFERENCE)
                .targetArtifactId("src/auth.ts")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();
        assertThatThrownBy(() -> traceabilityLinkService.createLink("proj-001", req1, "user-123"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Relationship type DEPENDS_ON only supports REQUIREMENT to REQUIREMENT links.");

        // VERIFIED_BY requires REQUIREMENT -> TEST_CASE
        CreateTraceabilityLinkRequest req2 = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-A")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-B")
                .linkType(TraceabilityLinkType.VERIFIED_BY)
                .build();
        assertThatThrownBy(() -> traceabilityLinkService.createLink("proj-001", req2, "user-123"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Relationship type VERIFIED_BY requires source REQUIREMENT and target TEST_CASE.");

        // IMPLEMENTED_BY requires target CODE_REFERENCE, GITHUB_COMMIT, or GITHUB_PULL_REQUEST
        CreateTraceabilityLinkRequest req3 = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-A")
                .targetArtifactType(TraceabilityArtifactType.TEST_CASE)
                .targetArtifactId("tc-101")
                .linkType(TraceabilityLinkType.IMPLEMENTED_BY)
                .build();
        assertThatThrownBy(() -> traceabilityLinkService.createLink("proj-001", req3, "user-123"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Relationship type IMPLEMENTED_BY requires source REQUIREMENT and target CODE_REFERENCE");
    }

    @Test
    @DisplayName("Should reject link creation when source requirement is not found in project")
    void testRejectWhenSourceRequirementNotFound() {
        CreateTraceabilityLinkRequest request = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-missing")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-B")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(requirementRepository.findByIdAndProjectId("req-missing", "proj-001")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> traceabilityLinkService.createLink("proj-001", request, "user-123"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Requirement not found with id req-missing in project proj-001");
    }

    @Test
    @DisplayName("Should reject link creation when target requirement is not found in project")
    void testRejectWhenTargetRequirementNotFound() {
        CreateTraceabilityLinkRequest request = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-A")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-missing")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(requirementRepository.findByIdAndProjectId("req-A", "proj-001")).thenReturn(Optional.of(reqA));
        when(requirementRepository.findByIdAndProjectId("req-missing", "proj-001")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> traceabilityLinkService.createLink("proj-001", request, "user-123"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Requirement not found with id req-missing in project proj-001");
    }

    // =========================================================================
    // 3. Circular Dependency Detection
    // =========================================================================

    @Test
    @DisplayName("Should detect and prevent direct circular dependency: A -> B already exists, adding B -> A")
    void testDetectDirectCircularDependency() {
        // Link req-A -> req-B exists
        TraceabilityLink linkAToB = TraceabilityLink.builder()
                .id("link-AB")
                .projectId("proj-001")
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-A")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-B")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .status(TraceabilityLinkStatus.ACTIVE)
                .build();

        CreateTraceabilityLinkRequest requestBToA = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-B")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-A")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(requirementRepository.findByIdAndProjectId("req-B", "proj-001")).thenReturn(Optional.of(reqB));
        when(requirementRepository.findByIdAndProjectId("req-A", "proj-001")).thenReturn(Optional.of(reqA));
        when(traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndTargetArtifactTypeAndTargetArtifactIdAndLinkType(
                any(), any(), any(), any(), any(), any())).thenReturn(Optional.empty());

        // When traversing from target (req-A), outgoing link goes to req-B
        when(traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndStatus(
                "proj-001", TraceabilityArtifactType.REQUIREMENT, "req-A", TraceabilityLinkStatus.ACTIVE))
                .thenReturn(List.of(linkAToB));

        assertThatThrownBy(() -> traceabilityLinkService.createLink("proj-001", requestBToA, "user-123"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Circular dependency detected: Adding a DEPENDS_ON link from 'req-B' to 'req-A' would create a cycle.");
    }

    @Test
    @DisplayName("Should detect and prevent transitive circular dependency: A -> B -> C exists, adding C -> A")
    void testDetectTransitiveCircularDependency() {
        // req-A -> req-B
        TraceabilityLink linkAB = TraceabilityLink.builder()
                .id("link-AB")
                .projectId("proj-001")
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-A")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-B")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .status(TraceabilityLinkStatus.ACTIVE)
                .build();

        // req-B -> req-C
        TraceabilityLink linkBC = TraceabilityLink.builder()
                .id("link-BC")
                .projectId("proj-001")
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-B")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-C")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .status(TraceabilityLinkStatus.ACTIVE)
                .build();

        // Propose req-C -> req-A
        CreateTraceabilityLinkRequest requestCToA = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-C")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-A")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(requirementRepository.findByIdAndProjectId("req-C", "proj-001")).thenReturn(Optional.of(reqC));
        when(requirementRepository.findByIdAndProjectId("req-A", "proj-001")).thenReturn(Optional.of(reqA));
        when(traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndTargetArtifactTypeAndTargetArtifactIdAndLinkType(
                any(), any(), any(), any(), any(), any())).thenReturn(Optional.empty());

        // Target is req-A -> reaches req-B -> reaches req-C (which is source!)
        when(traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndStatus(
                "proj-001", TraceabilityArtifactType.REQUIREMENT, "req-A", TraceabilityLinkStatus.ACTIVE))
                .thenReturn(List.of(linkAB));
        when(traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndStatus(
                "proj-001", TraceabilityArtifactType.REQUIREMENT, "req-B", TraceabilityLinkStatus.ACTIVE))
                .thenReturn(List.of(linkBC));

        assertThatThrownBy(() -> traceabilityLinkService.createLink("proj-001", requestCToA, "user-123"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Circular dependency detected: Adding a DEPENDS_ON link from 'req-C' to 'req-A' would create a cycle.");
    }

    @Test
    @DisplayName("Should allow non-cyclic DAG dependencies (e.g. Diamond shape: A -> B, A -> C, B -> D, C -> D)")
    void testAllowAcyclicDiamondDependencies() {
        Requirement reqD = Requirement.builder().id("req-D").projectId("proj-001").build();

        CreateTraceabilityLinkRequest requestBToD = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-B")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-D")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(requirementRepository.findByIdAndProjectId("req-B", "proj-001")).thenReturn(Optional.of(reqB));
        when(requirementRepository.findByIdAndProjectId("req-D", "proj-001")).thenReturn(Optional.of(reqD));
        when(traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndTargetArtifactTypeAndTargetArtifactIdAndLinkType(
                any(), any(), any(), any(), any(), any())).thenReturn(Optional.empty());

        // Target is req-D, which has no outgoing links
        when(traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndStatus(
                "proj-001", TraceabilityArtifactType.REQUIREMENT, "req-D", TraceabilityLinkStatus.ACTIVE))
                .thenReturn(Collections.emptyList());
        when(traceabilityLinkRepository.save(any(TraceabilityLink.class))).thenAnswer(i -> i.getArgument(0));

        TraceabilityLinkResponse response = traceabilityLinkService.createLink("proj-001", requestBToD, "user-123");
        assertThat(response).isNotNull();
    }

    // =========================================================================
    // 4. Authorization & Project Isolation
    // =========================================================================

    @Test
    @DisplayName("Should throw AccessDeniedException when authenticated user is not project owner")
    void testUnauthorizedAccessDenied() {
        CreateTraceabilityLinkRequest request = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-A")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-B")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));

        assertThatThrownBy(() -> traceabilityLinkService.createLink("proj-001", request, "user-intruder"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Access denied. Insufficient privileges.");
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when project does not exist")
    void testProjectNotFound() {
        CreateTraceabilityLinkRequest request = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-A")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-B")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        when(projectRepository.findById("proj-nonexistent")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> traceabilityLinkService.createLink("proj-nonexistent", request, "user-123"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Project not found with id: proj-nonexistent");
    }

    // =========================================================================
    // 5. Query Operations & Filtering
    // =========================================================================

    @Test
    @DisplayName("Should find link by ID and project ID")
    void testGetLinkByIdSuccess() {
        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(traceabilityLinkRepository.findByIdAndProjectId("link-001", "proj-001"))
                .thenReturn(Optional.of(sampleActiveLink));

        TraceabilityLinkResponse response = traceabilityLinkService.getLinkById("proj-001", "link-001", "user-123");

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo("link-001");
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when link ID is not found in project (Project Isolation)")
    void testGetLinkByIdNotFound() {
        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(traceabilityLinkRepository.findByIdAndProjectId("link-999", "proj-001"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> traceabilityLinkService.getLinkById("proj-001", "link-999", "user-123"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Traceability link not found with ID link-999 in project proj-001");
    }

    @Test
    @DisplayName("Should retrieve paginated and unpaginated project links with and without status filter")
    void testGetLinksByProject() {
        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        Pageable pageable = PageRequest.of(0, 10);
        Page<TraceabilityLink> page = new PageImpl<>(List.of(sampleActiveLink), pageable, 1);

        // Paginated with status
        when(traceabilityLinkRepository.findByProjectIdAndStatus("proj-001", TraceabilityLinkStatus.ACTIVE, pageable))
                .thenReturn(page);
        Page<TraceabilityLinkResponse> pageRes = traceabilityLinkService.getLinksByProject("proj-001", TraceabilityLinkStatus.ACTIVE, pageable, "user-123");
        assertThat(pageRes.getContent()).hasSize(1);

        // Unpaginated without status
        when(traceabilityLinkRepository.findByProjectIdOrderByCreatedAtDesc("proj-001"))
                .thenReturn(List.of(sampleActiveLink, sampleInactiveLink));
        List<TraceabilityLinkResponse> listRes = traceabilityLinkService.getLinksByProject("proj-001", null, "user-123");
        assertThat(listRes).hasSize(2);
    }

    @Test
    @DisplayName("Should retrieve outgoing and incoming relationships")
    void testGetOutgoingAndIncomingLinks() {
        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        Pageable pageable = PageRequest.of(0, 5);

        // Outgoing
        when(traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndStatus(
                "proj-001", TraceabilityArtifactType.REQUIREMENT, "req-A", TraceabilityLinkStatus.ACTIVE, pageable))
                .thenReturn(new PageImpl<>(List.of(sampleActiveLink)));
        Page<TraceabilityLinkResponse> outgoing = traceabilityLinkService.getOutgoingLinks(
                "proj-001", TraceabilityArtifactType.REQUIREMENT, "req-A", TraceabilityLinkStatus.ACTIVE, pageable, "user-123");
        assertThat(outgoing.getContent()).hasSize(1);

        // Incoming
        when(traceabilityLinkRepository.findByProjectIdAndTargetArtifactTypeAndTargetArtifactIdAndStatus(
                "proj-001", TraceabilityArtifactType.REQUIREMENT, "req-B", TraceabilityLinkStatus.ACTIVE, pageable))
                .thenReturn(new PageImpl<>(List.of(sampleActiveLink)));
        Page<TraceabilityLinkResponse> incoming = traceabilityLinkService.getIncomingLinks(
                "proj-001", TraceabilityArtifactType.REQUIREMENT, "req-B", TraceabilityLinkStatus.ACTIVE, pageable, "user-123");
        assertThat(incoming.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("Should retrieve links by relationship type")
    void testGetLinksByType() {
        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(traceabilityLinkRepository.findByProjectIdAndLinkTypeOrderByCreatedAtDesc("proj-001", TraceabilityLinkType.DEPENDS_ON))
                .thenReturn(List.of(sampleActiveLink));

        List<TraceabilityLinkResponse> res = traceabilityLinkService.getLinksByType(
                "proj-001", TraceabilityLinkType.DEPENDS_ON, null, "user-123");
        assertThat(res).hasSize(1);
        assertThat(res.get(0).getLinkType()).isEqualTo(TraceabilityLinkType.DEPENDS_ON);
    }

    // =========================================================================
    // 6. Update, Deactivate, Reactivate, Delete Operations
    // =========================================================================

    @Test
    @DisplayName("Should update description while preserving immutable identity fields")
    void testUpdateLinkSuccess() {
        UpdateTraceabilityLinkRequest request = UpdateTraceabilityLinkRequest.builder()
                .description("Updated architecture note")
                .build();

        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(traceabilityLinkRepository.findByIdAndProjectId("link-001", "proj-001"))
                .thenReturn(Optional.of(sampleActiveLink));
        when(traceabilityLinkRepository.save(any(TraceabilityLink.class))).thenAnswer(i -> i.getArgument(0));

        TraceabilityLinkResponse response = traceabilityLinkService.updateLink("proj-001", "link-001", request, "user-123");

        assertThat(response.getDescription()).isEqualTo("Updated architecture note");
        assertThat(response.getSourceArtifactId()).isEqualTo("req-A");
        assertThat(response.getTargetArtifactId()).isEqualTo("req-B");
        assertThat(response.getLinkType()).isEqualTo(TraceabilityLinkType.DEPENDS_ON);
    }

    @Test
    @DisplayName("Should deactivate an active link (soft delete)")
    void testDeactivateLink() {
        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(traceabilityLinkRepository.findByIdAndProjectId("link-001", "proj-001"))
                .thenReturn(Optional.of(sampleActiveLink));
        when(traceabilityLinkRepository.save(any(TraceabilityLink.class))).thenAnswer(i -> i.getArgument(0));

        TraceabilityLinkResponse response = traceabilityLinkService.deactivateLink("proj-001", "link-001", "user-123");

        assertThat(response.getStatus()).isEqualTo(TraceabilityLinkStatus.INACTIVE);
        assertThat(sampleActiveLink.getStatus()).isEqualTo(TraceabilityLinkStatus.INACTIVE);
    }

    @Test
    @DisplayName("Should return unchanged if link is already deactivated (idempotent)")
    void testDeactivateLinkAlreadyInactive() {
        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(traceabilityLinkRepository.findByIdAndProjectId("link-002", "proj-001"))
                .thenReturn(Optional.of(sampleInactiveLink));

        TraceabilityLinkResponse response = traceabilityLinkService.deactivateLink("proj-001", "link-002", "user-123");

        assertThat(response.getStatus()).isEqualTo(TraceabilityLinkStatus.INACTIVE);
        verify(traceabilityLinkRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should reactivate an inactive link")
    void testReactivateLink() {
        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(traceabilityLinkRepository.findByIdAndProjectId("link-002", "proj-001"))
                .thenReturn(Optional.of(sampleInactiveLink));
        when(traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndStatus(
                "proj-001", TraceabilityArtifactType.REQUIREMENT, "req-B", TraceabilityLinkStatus.ACTIVE))
                .thenReturn(Collections.emptyList());
        when(traceabilityLinkRepository.save(any(TraceabilityLink.class))).thenAnswer(i -> i.getArgument(0));

        TraceabilityLinkResponse response = traceabilityLinkService.reactivateLink("proj-001", "link-002", "user-123");

        assertThat(response.getStatus()).isEqualTo(TraceabilityLinkStatus.ACTIVE);
        assertThat(sampleInactiveLink.getStatus()).isEqualTo(TraceabilityLinkStatus.ACTIVE);
    }

    @Test
    @DisplayName("Should permanently delete a link")
    void testDeleteLink() {
        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(traceabilityLinkRepository.findByIdAndProjectId("link-001", "proj-001"))
                .thenReturn(Optional.of(sampleActiveLink));
        doNothing().when(traceabilityLinkRepository).deleteByIdAndProjectId("link-001", "proj-001");

        traceabilityLinkService.deleteLink("proj-001", "link-001", "user-123");

        verify(traceabilityLinkRepository, times(1)).deleteByIdAndProjectId("link-001", "proj-001");
    }
}
