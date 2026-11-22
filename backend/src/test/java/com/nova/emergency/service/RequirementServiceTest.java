package com.nova.emergency.service;

import com.nova.emergency.dto.CreateRequirementRequest;
import com.nova.emergency.dto.CreateRequirementVersionRequest;
import com.nova.emergency.dto.RequirementResponse;
import com.nova.emergency.dto.UpdateRequirementRequest;
import com.nova.emergency.exception.InvalidStatusTransitionException;
import com.nova.emergency.exception.ResourceNotFoundException;
import com.nova.emergency.model.ChangeType;
import com.nova.emergency.model.Project;
import com.nova.emergency.model.Requirement;
import com.nova.emergency.model.RequirementVersion;
import com.nova.emergency.model.ReviewStatus;
import com.nova.emergency.repository.ProjectRepository;
import com.nova.emergency.repository.RequirementRepository;
import com.nova.emergency.repository.RequirementVersionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RequirementServiceTest {

    @Mock
    private RequirementRepository requirementRepository;

    @Mock
    private RequirementVersionRepository versionRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private RequirementVersionService versionService;

    @InjectMocks
    private RequirementService requirementService;

    private Project testProject;
    private Requirement sampleRequirement;
    private RequirementVersion sampleVersion1;

    @BeforeEach
    void setUp() {
        testProject = new Project();
        testProject.setId("proj-001");
        testProject.setOwnerId("user-123");

        sampleRequirement = Requirement.builder()
                .id("req-001")
                .projectId("proj-001")
                .requirementKey("REQ-001")
                .title("User Authentication")
                .description("Users must log in with email and password.")
                .type(Requirement.TYPE_FUNCTIONAL)
                .priority(Requirement.PRIORITY_HIGH)
                .status(Requirement.STATUS_DRAFT)
                .createdBy("user-123")
                .createdAt(Instant.now().toString())
                .updatedAt(Instant.now().toString())
                .build();

        sampleVersion1 = RequirementVersion.builder()
                .id("ver-001")
                .projectId("proj-001")
                .requirementId("req-001")
                .versionNumber(1)
                .title("User Authentication")
                .description("Users must log in with email and password.")
                .changeType(ChangeType.CREATED)
                .reviewStatus(ReviewStatus.DRAFT)
                .createdBy("user-123")
                .createdAt(Instant.now().toString())
                .build();
    }

    @Test
    @DisplayName("Service Test 1 & 13 & 16: Successful requirement creation initializes baseline version 1 and currentVersionId")
    void testCreateRequirementSuccess() {
        CreateRequirementRequest req = CreateRequirementRequest.builder()
                .title("User Authentication")
                .description("Users must log in with email and password.")
                .type("FUNCTIONAL")
                .priority("HIGH")
                .build();

        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(requirementRepository.countByProjectId("proj-001")).thenReturn(0L);
        when(requirementRepository.existsByProjectIdAndRequirementKey("proj-001", "REQ-001")).thenReturn(false);
        when(requirementRepository.save(any(Requirement.class))).thenAnswer(invocation -> {
            Requirement r = invocation.getArgument(0);
            if (r.getId() == null) r.setId("req-001");
            return r;
        });
        when(versionRepository.save(any(RequirementVersion.class))).thenReturn(sampleVersion1);

        RequirementResponse response = requirementService.createRequirement("proj-001", req, "user-123");

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo("req-001");
        assertThat(response.getRequirementKey()).isEqualTo("REQ-001");
        assertThat(response.getTitle()).isEqualTo("User Authentication");
        assertThat(response.getStatus()).isEqualTo("DRAFT");
        assertThat(response.getCurrentVersionId()).isEqualTo("ver-001");

        verify(versionRepository, times(1)).save(any(RequirementVersion.class));
    }

    @Test
    @DisplayName("Service Test 2: Invalid creation payload throws IllegalArgumentException")
    void testCreateRequirementInvalidPayload() {
        CreateRequirementRequest req = CreateRequirementRequest.builder()
                .title("")
                .description("")
                .build();

        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));

        assertThatThrownBy(() -> requirementService.createRequirement("proj-001", req, "user-123"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Service Test 3 & 4: Unauthorized user throws AccessDeniedException")
    void testCreateRequirementAccessDenied() {
        CreateRequirementRequest req = CreateRequirementRequest.builder()
                .title("Valid Title")
                .description("Valid Description")
                .build();

        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));

        assertThatThrownBy(() -> requirementService.createRequirement("proj-001", req, "intruder-456"))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("Service Test 5: List requirements returns filtered results")
    void testListRequirementsSuccess() {
        Requirement r2 = Requirement.builder()
                .id("req-002")
                .projectId("proj-001")
                .requirementKey("REQ-002")
                .title("Audit Logging")
                .description("System logs all actions.")
                .type(Requirement.TYPE_NON_FUNCTIONAL)
                .priority(Requirement.PRIORITY_LOW)
                .status(Requirement.STATUS_APPROVED)
                .build();

        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(requirementRepository.findByProjectIdOrderByCreatedAtDesc("proj-001"))
                .thenReturn(List.of(sampleRequirement, r2));

        List<RequirementResponse> list = requirementService.getRequirements(
                "proj-001", "APPROVED", null, null, null, null, null, "user-123");

        assertThat(list).hasSize(1);
        assertThat(list.get(0).getId()).isEqualTo("req-002");
    }

    @Test
    @DisplayName("Service Test 6: Cross-project access is rejected")
    void testCrossProjectAccessRejection() {
        when(projectRepository.findById("proj-999")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> requirementService.getRequirement("proj-999", "req-001", "user-123"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Service Test 7: Get requirement details returns expected record")
    void testGetRequirementDetailsSuccess() {
        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(requirementRepository.findByIdAndProjectId("req-001", "proj-001"))
                .thenReturn(Optional.of(sampleRequirement));

        RequirementResponse response = requirementService.getRequirement("proj-001", "req-001", "user-123");

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo("req-001");
        assertThat(response.getTitle()).isEqualTo("User Authentication");
    }

    @Test
    @DisplayName("Service Test 8: Missing requirement throws ResourceNotFoundException")
    void testGetRequirementMissing() {
        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(requirementRepository.findByIdAndProjectId("non-existent", "proj-001"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> requirementService.getRequirement("proj-001", "non-existent", "user-123"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Service Test 9: Update DRAFT requirement updates specification and draft version")
    void testUpdateDraftRequirement() {
        UpdateRequirementRequest req = UpdateRequirementRequest.builder()
                .title("Updated User Authentication")
                .description("Updated description with MFA.")
                .type("FUNCTIONAL")
                .priority("CRITICAL")
                .build();

        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(requirementRepository.findByIdAndProjectId("req-001", "proj-001"))
                .thenReturn(Optional.of(sampleRequirement));
        when(versionRepository.findByProjectIdAndRequirementIdAndVersionNumber("proj-001", "req-001", 1))
                .thenReturn(Optional.of(sampleVersion1));
        when(requirementRepository.save(any(Requirement.class))).thenAnswer(i -> i.getArgument(0));

        RequirementResponse response = requirementService.updateRequirement("proj-001", "req-001", req, "user-123");

        assertThat(response.getTitle()).isEqualTo("Updated User Authentication");
        assertThat(response.getDescription()).isEqualTo("Updated description with MFA.");
        assertThat(response.getPriority()).isEqualTo("CRITICAL");
        verify(versionRepository, times(1)).save(any(RequirementVersion.class));
    }

    @Test
    @DisplayName("Service Test 11 & 15: Update APPROVED requirement routes content change to draft version without overwriting approved active text")
    void testUpdateApprovedRequirementPreservesActiveContent() {
        sampleRequirement.setStatus(Requirement.STATUS_APPROVED);
        sampleRequirement.setCurrentVersionId("ver-approved-001");

        UpdateRequirementRequest req = UpdateRequirementRequest.builder()
                .title("New Proposed Title")
                .description("New Proposed Description")
                .type("FUNCTIONAL")
                .priority("HIGH")
                .build();

        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(requirementRepository.findByIdAndProjectId("req-001", "proj-001"))
                .thenReturn(Optional.of(sampleRequirement));
        when(requirementRepository.save(any(Requirement.class))).thenAnswer(i -> i.getArgument(0));

        RequirementResponse response = requirementService.updateRequirement("proj-001", "req-001", req, "user-123");

        // Active title and description remain protected at approved version
        assertThat(response.getTitle()).isEqualTo("User Authentication");
        assertThat(response.getDescription()).isEqualTo("Users must log in with email and password.");
        assertThat(response.getCurrentVersionId()).isEqualTo("ver-approved-001");

        // Verified that createDraftVersion was invoked on the version service
        verify(versionService, times(1)).createDraftVersion(eq("proj-001"), eq("req-001"), any(CreateRequirementVersionRequest.class), eq("user-123"));
    }

    @Test
    @DisplayName("Service Test 12: Requirement status transition adheres to allowed transitions")
    void testUpdateStatusTransitions() {
        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(requirementRepository.findByIdAndProjectId("req-001", "proj-001"))
                .thenReturn(Optional.of(sampleRequirement));
        when(requirementRepository.save(any(Requirement.class))).thenAnswer(i -> i.getArgument(0));

        // DRAFT -> IN_REVIEW: Allowed
        RequirementResponse res = requirementService.updateStatus("proj-001", "req-001", "IN_REVIEW", "user-123");
        assertThat(res.getStatus()).isEqualTo("IN_REVIEW");

        // IN_REVIEW -> DRAFT: Allowed (Direct approval without review flow is rejected)
        sampleRequirement.setStatus(Requirement.STATUS_DRAFT);
        // DRAFT -> APPROVED: Invalid transition (throws 409 Conflict)
        assertThatThrownBy(() -> requirementService.updateStatus("proj-001", "req-001", "APPROVED", "user-123"))
                .isInstanceOf(InvalidStatusTransitionException.class)
                .hasMessageContaining("Invalid requirement status transition from DRAFT to APPROVED");
    }

    @Test
    @DisplayName("Service Test 14: Duplicate baseline creation caught gracefully")
    void testDuplicateBaselineCaughtGracefully() {
        CreateRequirementRequest req = CreateRequirementRequest.builder()
                .title("User Authentication")
                .description("Desc")
                .build();

        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(requirementRepository.countByProjectId("proj-001")).thenReturn(0L);
        when(requirementRepository.existsByProjectIdAndRequirementKey("proj-001", "REQ-001")).thenReturn(false);
        when(requirementRepository.save(any(Requirement.class))).thenAnswer(invocation -> {
            Requirement r = invocation.getArgument(0);
            if (r.getId() == null) r.setId("req-001");
            return r;
        });
        when(versionRepository.save(any(RequirementVersion.class)))
                .thenThrow(new DuplicateKeyException("E11000 duplicate key error"));
        when(versionRepository.findByRequirementIdAndVersionNumber("req-001", 1))
                .thenReturn(Optional.of(sampleVersion1));

        RequirementResponse response = requirementService.createRequirement("proj-001", req, "user-123");

        assertThat(response).isNotNull();
        assertThat(response.getCurrentVersionId()).isEqualTo("ver-001");
    }

    @Test
    @DisplayName("Service Test: Delete requirement soft-deletes requirement as DEPRECATED")
    void testDeleteRequirementSoftDelete() {
        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(requirementRepository.findByIdAndProjectId("req-001", "proj-001"))
                .thenReturn(Optional.of(sampleRequirement));
        when(requirementRepository.save(any(Requirement.class))).thenAnswer(i -> i.getArgument(0));

        RequirementResponse response = requirementService.deleteRequirement("proj-001", "req-001", "user-123");

        assertThat(response.getStatus()).isEqualTo("DEPRECATED");
    }
}
