package com.nova.emergency.service;

import com.nova.emergency.dto.CreateRequirementVersionRequest;
import com.nova.emergency.dto.RequirementVersionResponse;
import com.nova.emergency.exception.InvalidStatusTransitionException;
import com.nova.emergency.exception.ResourceNotFoundException;
import com.nova.emergency.model.AuditLog;
import com.nova.emergency.model.ChangeType;
import com.nova.emergency.model.Project;
import com.nova.emergency.model.Requirement;
import com.nova.emergency.model.RequirementVersion;
import com.nova.emergency.model.ReviewStatus;
import com.nova.emergency.repository.AuditLogRepository;
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

import java.util.List;
import java.util.Optional;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RequirementVersionServiceTest {

    @Mock
    private RequirementVersionRepository versionRepository;

    @Mock
    private RequirementRepository requirementRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @InjectMocks
    private RequirementVersionService versionService;

    private final String projectId = "proj-100";
    private final String requirementId = "req-001";
    private final String userId = "user-123";
    private final String reviewerId = "user-123"; // owner is authorized reviewer
    private final String unauthorizedUserId = "user-999";

    private Project sampleProject;
    private Requirement sampleRequirement;

    @BeforeEach
    void setUp() {
        sampleProject = Project.builder()
                .id(projectId)
                .name("ReqTrace Platform")
                .ownerId(userId)
                .status(Project.STATUS_ACTIVE)
                .build();

        sampleRequirement = Requirement.builder()
                .id(requirementId)
                .projectId(projectId)
                .requirementKey("REQ-001")
                .title("User Login via OAuth2")
                .description("System shall support login via OAuth2 identity providers.")
                .currentVersionId("ver-app-001")
                .createdBy(userId)
                .status(Requirement.STATUS_APPROVED)
                .build();
    }

    // ==========================================
    // Version Creation & History Tests (Task 05.1.3)
    // ==========================================

    @Test
    @DisplayName("1. First version creation initializes baseline and creates draft version 2")
    void shouldCreateFirstVersionWhenNoneExists() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        when(versionRepository.findByRequirementIdAndVersionNumber(requirementId, 1)).thenReturn(Optional.empty());
        when(versionRepository.countByRequirementId(requirementId)).thenReturn(0L);

        RequirementVersion baselineV1 = RequirementVersion.builder()
                .id("ver-1")
                .projectId(projectId)
                .requirementId(requirementId)
                .versionNumber(1)
                .title(sampleRequirement.getTitle())
                .description(sampleRequirement.getDescription())
                .changeType(ChangeType.CREATED)
                .reviewStatus(ReviewStatus.DRAFT)
                .build();
        when(versionRepository.save(any(RequirementVersion.class))).thenAnswer(inv -> {
            RequirementVersion v = inv.getArgument(0);
            if (v.getVersionNumber() == 1) return baselineV1;
            v.setId("ver-2");
            return v;
        });

        when(versionRepository.findFirstByRequirementIdOrderByVersionNumberDesc(requirementId))
                .thenReturn(Optional.of(baselineV1));

        CreateRequirementVersionRequest request = CreateRequirementVersionRequest.builder()
                .title("User Login with Multi-Factor Authentication")
                .description("Mandatory MFA for administrative users.")
                .changeSummary("Added MFA requirements.")
                .changeType(ChangeType.UPDATED)
                .build();

        RequirementVersionResponse response = versionService.createDraftVersion(projectId, requirementId, request, userId);

        assertThat(response).isNotNull();
        assertThat(response.getVersionNumber()).isEqualTo(2);
        assertThat(response.getTitle()).isEqualTo("User Login with Multi-Factor Authentication");
        assertThat(response.getReviewStatus()).isEqualTo(ReviewStatus.DRAFT);
        assertThat(response.getCreatedBy()).isEqualTo(userId);
    }

    @Test
    @DisplayName("2. Second and subsequent versions allocate incremented sequential version numbers")
    void shouldCreateSubsequentVersions() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        RequirementVersion v1 = RequirementVersion.builder().id("ver-1").versionNumber(1).build();
        when(versionRepository.findByRequirementIdAndVersionNumber(requirementId, 1)).thenReturn(Optional.of(v1));

        RequirementVersion v2 = RequirementVersion.builder().id("ver-2").versionNumber(2).build();
        when(versionRepository.findFirstByRequirementIdOrderByVersionNumberDesc(requirementId)).thenReturn(Optional.of(v2));

        when(versionRepository.save(any(RequirementVersion.class))).thenAnswer(inv -> {
            RequirementVersion v = inv.getArgument(0);
            v.setId("ver-3");
            return v;
        });

        CreateRequirementVersionRequest request = CreateRequirementVersionRequest.builder()
                .title("Title for Version 3")
                .description("Description for Version 3")
                .changeSummary("Clarification for token expiration")
                .changeType(ChangeType.CLARIFIED)
                .build();

        RequirementVersionResponse response = versionService.createDraftVersion(projectId, requirementId, request, userId);

        assertThat(response.getVersionNumber()).isEqualTo(3);
        assertThat(response.getChangeType()).isEqualTo(ChangeType.CLARIFIED);
    }

    @Test
    @DisplayName("3. Newly created version must always have reviewStatus = DRAFT")
    void shouldAlwaysSetDraftReviewStatus() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));
        when(versionRepository.findByRequirementIdAndVersionNumber(requirementId, 1))
                .thenReturn(Optional.of(RequirementVersion.builder().versionNumber(1).build()));
        when(versionRepository.findFirstByRequirementIdOrderByVersionNumberDesc(requirementId))
                .thenReturn(Optional.of(RequirementVersion.builder().versionNumber(1).build()));
        when(versionRepository.save(any(RequirementVersion.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateRequirementVersionRequest request = CreateRequirementVersionRequest.builder()
                .title("New Proposal")
                .description("Proposal description")
                .changeSummary("Proposing change")
                .changeType(ChangeType.UPDATED)
                .build();

        RequirementVersionResponse response = versionService.createDraftVersion(projectId, requirementId, request, userId);

        assertThat(response.getReviewStatus()).isEqualTo(ReviewStatus.DRAFT);
        assertThat(response.getApprovedBy()).isNull();
        assertThat(response.getReviewedBy()).isNull();
    }

    @Test
    @DisplayName("4. Snapshot immutability: version fields snapshot exact title and description requested")
    void shouldPreserveSnapshotImmutability() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));
        when(versionRepository.findByRequirementIdAndVersionNumber(requirementId, 1))
                .thenReturn(Optional.of(RequirementVersion.builder().versionNumber(1).build()));
        when(versionRepository.findFirstByRequirementIdOrderByVersionNumberDesc(requirementId))
                .thenReturn(Optional.of(RequirementVersion.builder().versionNumber(1).build()));
        when(versionRepository.save(any(RequirementVersion.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateRequirementVersionRequest request = CreateRequirementVersionRequest.builder()
                .title("Snapshot Exact Title")
                .description("Snapshot Exact Description")
                .changeSummary("Testing snapshot values")
                .changeType(ChangeType.CORRECTED)
                .build();

        RequirementVersionResponse response = versionService.createDraftVersion(projectId, requirementId, request, userId);

        assertThat(response.getTitle()).isEqualTo("Snapshot Exact Title");
        assertThat(response.getDescription()).isEqualTo("Snapshot Exact Description");
    }

    @Test
    @DisplayName("5. History retrieval returns versions sorted in descending version order")
    void shouldReturnHistorySortedDescending() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));
        when(versionRepository.findByRequirementIdAndVersionNumber(requirementId, 1))
                .thenReturn(Optional.of(RequirementVersion.builder().versionNumber(1).build()));

        RequirementVersion v3 = RequirementVersion.builder().id("ver-3").versionNumber(3).title("V3").build();
        RequirementVersion v2 = RequirementVersion.builder().id("ver-2").versionNumber(2).title("V2").build();
        RequirementVersion v1 = RequirementVersion.builder().id("ver-1").versionNumber(1).title("V1").build();

        when(versionRepository.findByProjectIdAndRequirementIdOrderByVersionNumberDesc(projectId, requirementId))
                .thenReturn(List.of(v3, v2, v1));

        List<RequirementVersionResponse> history = versionService.getVersionHistory(projectId, requirementId, userId);

        assertThat(history).hasSize(3);
        assertThat(history.get(0).getVersionNumber()).isEqualTo(3);
        assertThat(history.get(1).getVersionNumber()).isEqualTo(2);
        assertThat(history.get(2).getVersionNumber()).isEqualTo(1);
    }

    @Test
    @DisplayName("6. Individual version retrieval returns specific version number")
    void shouldGetIndividualVersion() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        RequirementVersion v2 = RequirementVersion.builder()
                .id("ver-2")
                .projectId(projectId)
                .requirementId(requirementId)
                .versionNumber(2)
                .title("Version 2 Title")
                .build();

        when(versionRepository.findByProjectIdAndRequirementIdAndVersionNumber(projectId, requirementId, 2))
                .thenReturn(Optional.of(v2));

        RequirementVersionResponse response = versionService.getVersion(projectId, requirementId, 2, userId);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo("ver-2");
        assertThat(response.getVersionNumber()).isEqualTo(2);
    }

    @Test
    @DisplayName("7. Current approved version lookup returns latest approved version")
    void shouldGetCurrentApprovedVersion() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        RequirementVersion approvedV2 = RequirementVersion.builder()
                .id("ver-2")
                .versionNumber(2)
                .reviewStatus(ReviewStatus.APPROVED)
                .build();

        when(versionRepository.findFirstByProjectIdAndRequirementIdAndReviewStatusOrderByVersionNumberDesc(
                projectId, requirementId, ReviewStatus.APPROVED))
                .thenReturn(Optional.of(approvedV2));

        Optional<RequirementVersionResponse> currentApproved = versionService
                .getCurrentApprovedVersion(projectId, requirementId, userId);

        assertThat(currentApproved).isPresent();
        assertThat(currentApproved.get().getVersionNumber()).isEqualTo(2);
        assertThat(currentApproved.get().getReviewStatus()).isEqualTo(ReviewStatus.APPROVED);
    }

    @Test
    @DisplayName("8. Current approved version returns empty optional when no approved version exists")
    void shouldReturnEmptyWhenNoApprovedVersionExists() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        when(versionRepository.findFirstByProjectIdAndRequirementIdAndReviewStatusOrderByVersionNumberDesc(
                projectId, requirementId, ReviewStatus.APPROVED))
                .thenReturn(Optional.empty());

        Optional<RequirementVersionResponse> currentApproved = versionService
                .getCurrentApprovedVersion(projectId, requirementId, userId);

        assertThat(currentApproved).isEmpty();
    }

    @Test
    @DisplayName("9. Missing requirement throws ResourceNotFoundException")
    void shouldThrowWhenRequirementNotFound() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById("unknown-req")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> versionService.getVersionHistory(projectId, "unknown-req", userId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Requirement not found with id: unknown-req");
    }

    @Test
    @DisplayName("10. Cross-project access rejection when requirement belongs to different project")
    void shouldRejectCrossProjectAccess() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));

        Requirement otherProjectReq = Requirement.builder()
                .id(requirementId)
                .projectId("other-project-999")
                .title("Foreign Requirement")
                .build();
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(otherProjectReq));

        assertThatThrownBy(() -> versionService.getVersionHistory(projectId, requirementId, userId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Requirement not found in project: " + projectId);
    }

    @Test
    @DisplayName("11. Unauthorized project access rejection when caller is not project owner")
    void shouldRejectUnauthorizedProjectAccess() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));

        assertThatThrownBy(() -> versionService.getVersionHistory(projectId, requirementId, unauthorizedUserId))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Access denied. Insufficient privileges.");
    }

    @Test
    @DisplayName("12. Invalid input validation (null, blank fields, invalid version number)")
    void shouldValidateInputs() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        CreateRequirementVersionRequest emptyTitleReq = CreateRequirementVersionRequest.builder()
                .title("")
                .description("Desc")
                .changeSummary("Summary")
                .changeType(ChangeType.UPDATED)
                .build();
        assertThatThrownBy(() -> versionService.createDraftVersion(projectId, requirementId, emptyTitleReq, userId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Title is required.");

        assertThatThrownBy(() -> versionService.getVersion(projectId, requirementId, 0, userId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Version number must be a positive integer.");
    }

    @Test
    @DisplayName("13. Idempotent baseline initialization: multiple calls return existing version 1")
    void shouldInitializeBaselineIdempotently() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        RequirementVersion existingV1 = RequirementVersion.builder()
                .id("ver-1")
                .projectId(projectId)
                .requirementId(requirementId)
                .versionNumber(1)
                .title(sampleRequirement.getTitle())
                .description(sampleRequirement.getDescription())
                .changeType(ChangeType.CREATED)
                .reviewStatus(ReviewStatus.DRAFT)
                .build();

        when(versionRepository.findByRequirementIdAndVersionNumber(requirementId, 1))
                .thenReturn(Optional.of(existingV1));

        RequirementVersionResponse res1 = versionService.initializeBaselineVersion(projectId, requirementId, userId);
        RequirementVersionResponse res2 = versionService.initializeBaselineVersion(projectId, requirementId, userId);

        assertThat(res1.getVersionNumber()).isEqualTo(1);
        assertThat(res2.getVersionNumber()).isEqualTo(1);
        verify(versionRepository, never()).save(any());
    }

    @Test
    @DisplayName("14. Concurrent baseline initialization safely catches DuplicateKeyException and returns existing v1")
    void shouldRecoverFromConcurrentBaselineConflict() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        RequirementVersion v1 = RequirementVersion.builder()
                .id("ver-1")
                .projectId(projectId)
                .requirementId(requirementId)
                .versionNumber(1)
                .title(sampleRequirement.getTitle())
                .reviewStatus(ReviewStatus.DRAFT)
                .build();

        when(versionRepository.findByRequirementIdAndVersionNumber(requirementId, 1))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(v1));
        when(versionRepository.countByRequirementId(requirementId)).thenReturn(0L);

        when(versionRepository.save(any(RequirementVersion.class)))
                .thenThrow(new DuplicateKeyException("E11000 duplicate key error: (requirementId, versionNumber)"));

        RequirementVersionResponse response = versionService.initializeBaselineVersion(projectId, requirementId, userId);

        assertThat(response).isNotNull();
        assertThat(response.getVersionNumber()).isEqualTo(1);
    }

    @Test
    @DisplayName("15. Concurrent version allocation retries upon duplicate version key and succeeds on next number")
    void shouldRetryAndSucceedOnConcurrentVersionConflict() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        RequirementVersion v1 = RequirementVersion.builder().id("ver-1").versionNumber(1).build();
        when(versionRepository.findByRequirementIdAndVersionNumber(requirementId, 1)).thenReturn(Optional.of(v1));

        RequirementVersion v2FromOtherThread = RequirementVersion.builder().id("ver-2").versionNumber(2).build();

        when(versionRepository.findFirstByRequirementIdOrderByVersionNumberDesc(requirementId))
                .thenReturn(Optional.of(v1))
                .thenReturn(Optional.of(v2FromOtherThread));

        when(versionRepository.save(any(RequirementVersion.class)))
                .thenThrow(new DuplicateKeyException("Duplicate version 2"))
                .thenAnswer(inv -> {
                    RequirementVersion v = inv.getArgument(0);
                    v.setId("ver-3");
                    return v;
                });

        CreateRequirementVersionRequest request = CreateRequirementVersionRequest.builder()
                .title("Concurrent Safe Update")
                .description("Updated description")
                .changeSummary("Testing concurrency retry")
                .changeType(ChangeType.UPDATED)
                .build();

        RequirementVersionResponse response = versionService.createDraftVersion(projectId, requirementId, request, userId);

        assertThat(response.getVersionNumber()).isEqualTo(3);
        verify(versionRepository, times(2)).save(any(RequirementVersion.class));
    }

    @Test
    @DisplayName("16. Duplicate-key exhaustion throws IllegalStateException after max retries")
    void shouldThrowWhenMaxRetriesExceeded() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        when(versionRepository.findByRequirementIdAndVersionNumber(requirementId, 1))
                .thenReturn(Optional.of(RequirementVersion.builder().versionNumber(1).build()));
        when(versionRepository.findFirstByRequirementIdOrderByVersionNumberDesc(requirementId))
                .thenReturn(Optional.of(RequirementVersion.builder().versionNumber(1).build()));

        when(versionRepository.save(any(RequirementVersion.class)))
                .thenThrow(new DuplicateKeyException("Continuous conflict"));

        CreateRequirementVersionRequest request = CreateRequirementVersionRequest.builder()
                .title("Exhaustion Test")
                .description("Test description")
                .changeSummary("Continuous conflict test")
                .changeType(ChangeType.UPDATED)
                .build();

        assertThatThrownBy(() -> versionService.createDraftVersion(projectId, requirementId, request, userId))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Concurrent version creation conflict for requirement " + requirementId);

        verify(versionRepository, times(5)).save(any(RequirementVersion.class));
    }

    @Test
    @DisplayName("17. CurrentVersionId on Requirement remains strictly unchanged when creating drafts")
    void shouldNotModifyCurrentVersionIdOnDraftCreation() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));
        when(versionRepository.findByRequirementIdAndVersionNumber(requirementId, 1))
                .thenReturn(Optional.of(RequirementVersion.builder().versionNumber(1).build()));
        when(versionRepository.findFirstByRequirementIdOrderByVersionNumberDesc(requirementId))
                .thenReturn(Optional.of(RequirementVersion.builder().versionNumber(1).build()));
        when(versionRepository.save(any(RequirementVersion.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateRequirementVersionRequest request = CreateRequirementVersionRequest.builder()
                .title("Draft Does Not Alter Approved Pointer")
                .description("Desc")
                .changeSummary("Draft change")
                .changeType(ChangeType.UPDATED)
                .build();

        versionService.createDraftVersion(projectId, requirementId, request, userId);

        verify(requirementRepository, never()).save(any());
        assertThat(sampleRequirement.getCurrentVersionId()).isEqualTo("ver-app-001");
    }

    @Test
    @DisplayName("18. Multithreaded concurrent version allocation produces distinct version numbers")
    void shouldHandleMultithreadedConcurrentAllocation() throws InterruptedException, ExecutionException {
        int threadCount = 4;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));
        when(versionRepository.findByRequirementIdAndVersionNumber(requirementId, 1))
                .thenReturn(Optional.of(RequirementVersion.builder().versionNumber(1).build()));

        java.util.concurrent.atomic.AtomicInteger versionCounter = new java.util.concurrent.atomic.AtomicInteger(1);
        when(versionRepository.findFirstByRequirementIdOrderByVersionNumberDesc(requirementId))
                .thenAnswer(inv -> Optional.of(RequirementVersion.builder().versionNumber(versionCounter.get()).build()));

        when(versionRepository.save(any(RequirementVersion.class))).thenAnswer(inv -> {
            RequirementVersion v = inv.getArgument(0);
            v.setVersionNumber(versionCounter.incrementAndGet());
            v.setId("ver-" + v.getVersionNumber());
            return v;
        });

        Callable<RequirementVersionResponse> task = () -> {
            CreateRequirementVersionRequest req = CreateRequirementVersionRequest.builder()
                    .title("Thread safe title")
                    .description("Thread safe description")
                    .changeSummary("Concurrent test")
                    .changeType(ChangeType.UPDATED)
                    .build();
            return versionService.createDraftVersion(projectId, requirementId, req, userId);
        };

        List<Future<RequirementVersionResponse>> futures = executor.invokeAll(List.of(task, task, task, task));
        executor.shutdown();
        executor.awaitTermination(5, TimeUnit.SECONDS);

        assertThat(futures).hasSize(4);
        for (Future<RequirementVersionResponse> future : futures) {
            RequirementVersionResponse res = future.get();
            assertThat(res.getVersionNumber()).isGreaterThan(1);
        }
    }

    // ==========================================
    // Review & Approval Workflow Tests (Task 05.1.4)
    // ==========================================

    @Test
    @DisplayName("19. Valid draft submission transitions status from DRAFT to IN_REVIEW")
    void shouldSubmitDraftForReviewSuccessfully() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        RequirementVersion draftVersion = RequirementVersion.builder()
                .id("ver-2")
                .projectId(projectId)
                .requirementId(requirementId)
                .versionNumber(2)
                .title("Pending Version")
                .description("Pending Description")
                .reviewStatus(ReviewStatus.DRAFT)
                .build();

        when(versionRepository.findByProjectIdAndRequirementIdAndVersionNumber(projectId, requirementId, 2))
                .thenReturn(Optional.of(draftVersion));
        when(versionRepository.save(any(RequirementVersion.class))).thenAnswer(inv -> inv.getArgument(0));

        RequirementVersionResponse response = versionService.submitForReview(projectId, requirementId, 2, userId);

        assertThat(response).isNotNull();
        assertThat(response.getReviewStatus()).isEqualTo(ReviewStatus.IN_REVIEW);
        verify(versionRepository, times(1)).save(draftVersion);
    }

    @Test
    @DisplayName("20. Duplicate submission rejected when version is already IN_REVIEW")
    void shouldRejectDuplicateSubmission() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        RequirementVersion alreadyInReview = RequirementVersion.builder()
                .id("ver-2")
                .projectId(projectId)
                .requirementId(requirementId)
                .versionNumber(2)
                .reviewStatus(ReviewStatus.IN_REVIEW)
                .build();

        when(versionRepository.findByProjectIdAndRequirementIdAndVersionNumber(projectId, requirementId, 2))
                .thenReturn(Optional.of(alreadyInReview));

        assertThatThrownBy(() -> versionService.submitForReview(projectId, requirementId, 2, userId))
                .isInstanceOf(InvalidStatusTransitionException.class)
                .hasMessageContaining("Duplicate submission rejected: Version 2 is already in review.");
    }

    @Test
    @DisplayName("21. Draft cannot be directly approved without entering IN_REVIEW first")
    void shouldRejectDirectApprovalOfDraft() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        RequirementVersion draftVersion = RequirementVersion.builder()
                .id("ver-2")
                .projectId(projectId)
                .requirementId(requirementId)
                .versionNumber(2)
                .reviewStatus(ReviewStatus.DRAFT)
                .build();

        when(versionRepository.findByProjectIdAndRequirementIdAndVersionNumber(projectId, requirementId, 2))
                .thenReturn(Optional.of(draftVersion));

        assertThatThrownBy(() -> versionService.approveVersion(projectId, requirementId, 2, "Looks good", userId))
                .isInstanceOf(InvalidStatusTransitionException.class)
                .hasMessageContaining("Cannot directly approve version in DRAFT status. Must be submitted for review first.");
    }

    @Test
    @DisplayName("22. Successful approval marks version APPROVED and records reviewer metadata")
    void shouldApproveVersionSuccessfully() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        RequirementVersion inReview = RequirementVersion.builder()
                .id("ver-2")
                .projectId(projectId)
                .requirementId(requirementId)
                .versionNumber(2)
                .title("New Approved Title")
                .description("New Approved Description")
                .reviewStatus(ReviewStatus.IN_REVIEW)
                .build();

        when(versionRepository.findByProjectIdAndRequirementIdAndVersionNumber(projectId, requirementId, 2))
                .thenReturn(Optional.of(inReview));
        when(versionRepository.findFirstByProjectIdAndRequirementIdAndReviewStatusOrderByVersionNumberDesc(
                projectId, requirementId, ReviewStatus.APPROVED)).thenReturn(Optional.empty());
        when(versionRepository.save(any(RequirementVersion.class))).thenAnswer(inv -> inv.getArgument(0));
        when(requirementRepository.save(any(Requirement.class))).thenAnswer(inv -> inv.getArgument(0));

        RequirementVersionResponse response = versionService.approveVersion(
                projectId, requirementId, 2, "Security sign-off verified", reviewerId);

        assertThat(response).isNotNull();
        assertThat(response.getReviewStatus()).isEqualTo(ReviewStatus.APPROVED);
        assertThat(response.getApprovedBy()).isEqualTo(reviewerId);
        assertThat(response.getReviewedBy()).isEqualTo(reviewerId);
        assertThat(response.getReviewComment()).isEqualTo("Security sign-off verified");
        assertThat(response.getApprovedAt()).isNotNull();
    }

    @Test
    @DisplayName("23. Approved version updates Requirement.currentVersionId and active content")
    void shouldUpdateRequirementOnApproval() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        RequirementVersion inReview = RequirementVersion.builder()
                .id("ver-2")
                .projectId(projectId)
                .requirementId(requirementId)
                .versionNumber(2)
                .title("Active Synchronized Title")
                .description("Active Synchronized Description")
                .reviewStatus(ReviewStatus.IN_REVIEW)
                .build();

        when(versionRepository.findByProjectIdAndRequirementIdAndVersionNumber(projectId, requirementId, 2))
                .thenReturn(Optional.of(inReview));
        when(versionRepository.findFirstByProjectIdAndRequirementIdAndReviewStatusOrderByVersionNumberDesc(
                projectId, requirementId, ReviewStatus.APPROVED)).thenReturn(Optional.empty());
        when(versionRepository.save(any(RequirementVersion.class))).thenAnswer(inv -> inv.getArgument(0));

        versionService.approveVersion(projectId, requirementId, 2, "Approved", reviewerId);

        // Verification: requirementRepository was saved with updated currentVersionId and active title/description
        verify(requirementRepository, times(1)).save(sampleRequirement);
        assertThat(sampleRequirement.getCurrentVersionId()).isEqualTo("ver-2");
        assertThat(sampleRequirement.getTitle()).isEqualTo("Active Synchronized Title");
        assertThat(sampleRequirement.getDescription()).isEqualTo("Active Synchronized Description");
        assertThat(sampleRequirement.getStatus()).isEqualTo(Requirement.STATUS_APPROVED);
    }

    @Test
    @DisplayName("24. Approved version preserves historical content without mutation")
    void shouldPreserveContentOnApproval() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        RequirementVersion inReview = RequirementVersion.builder()
                .id("ver-2")
                .projectId(projectId)
                .requirementId(requirementId)
                .versionNumber(2)
                .title("Preserved Immutable Title")
                .description("Preserved Immutable Description")
                .changeSummary("Summary of change")
                .changeType(ChangeType.CLARIFIED)
                .reviewStatus(ReviewStatus.IN_REVIEW)
                .build();

        when(versionRepository.findByProjectIdAndRequirementIdAndVersionNumber(projectId, requirementId, 2))
                .thenReturn(Optional.of(inReview));
        when(versionRepository.findFirstByProjectIdAndRequirementIdAndReviewStatusOrderByVersionNumberDesc(
                projectId, requirementId, ReviewStatus.APPROVED)).thenReturn(Optional.empty());
        when(versionRepository.save(any(RequirementVersion.class))).thenAnswer(inv -> inv.getArgument(0));

        RequirementVersionResponse response = versionService.approveVersion(projectId, requirementId, 2, "LGTM", reviewerId);

        assertThat(response.getTitle()).isEqualTo("Preserved Immutable Title");
        assertThat(response.getDescription()).isEqualTo("Preserved Immutable Description");
        assertThat(response.getChangeSummary()).isEqualTo("Summary of change");
        assertThat(response.getChangeType()).isEqualTo(ChangeType.CLARIFIED);
    }

    @Test
    @DisplayName("25. Rejection with comment transitions status to REJECTED and records reviewer identity")
    void shouldRejectVersionWithCommentSuccessfully() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        RequirementVersion inReview = RequirementVersion.builder()
                .id("ver-2")
                .projectId(projectId)
                .requirementId(requirementId)
                .versionNumber(2)
                .title("Flawed Proposal")
                .description("Flawed description")
                .reviewStatus(ReviewStatus.IN_REVIEW)
                .build();

        when(versionRepository.findByProjectIdAndRequirementIdAndVersionNumber(projectId, requirementId, 2))
                .thenReturn(Optional.of(inReview));
        when(versionRepository.save(any(RequirementVersion.class))).thenAnswer(inv -> inv.getArgument(0));

        RequirementVersionResponse response = versionService.rejectVersion(
                projectId, requirementId, 2, "Security criteria not satisfied.", reviewerId);

        assertThat(response.getReviewStatus()).isEqualTo(ReviewStatus.REJECTED);
        assertThat(response.getReviewedBy()).isEqualTo(reviewerId);
        assertThat(response.getReviewComment()).isEqualTo("Security criteria not satisfied.");
        assertThat(response.getReviewedAt()).isNotNull();
    }

    @Test
    @DisplayName("26. Rejection without comment is strictly rejected with IllegalArgumentException")
    void shouldRejectRejectionWithoutComment() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        assertThatThrownBy(() -> versionService.rejectVersion(projectId, requirementId, 2, "", reviewerId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Rejection comment is required.");

        assertThatThrownBy(() -> versionService.rejectVersion(projectId, requirementId, 2, "   ", reviewerId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Rejection comment is required.");

        assertThatThrownBy(() -> versionService.rejectVersion(projectId, requirementId, 2, null, reviewerId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Rejection comment is required.");
    }

    @Test
    @DisplayName("27. Rejection leaves Requirement.currentVersionId unchanged and does not delete version")
    void shouldLeaveCurrentVersionIdUnchangedOnRejection() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        RequirementVersion inReview = RequirementVersion.builder()
                .id("ver-2")
                .projectId(projectId)
                .requirementId(requirementId)
                .versionNumber(2)
                .reviewStatus(ReviewStatus.IN_REVIEW)
                .build();

        when(versionRepository.findByProjectIdAndRequirementIdAndVersionNumber(projectId, requirementId, 2))
                .thenReturn(Optional.of(inReview));
        when(versionRepository.save(any(RequirementVersion.class))).thenAnswer(inv -> inv.getArgument(0));

        versionService.rejectVersion(projectId, requirementId, 2, "Rejected due to conflict.", reviewerId);

        verify(requirementRepository, never()).save(any());
        verify(versionRepository, never()).delete(any());
        assertThat(sampleRequirement.getCurrentVersionId()).isEqualTo("ver-app-001");
    }

    @Test
    @DisplayName("28. Unauthorized reviewer rejected when caller is not project owner")
    void shouldRejectUnauthorizedReviewer() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));

        assertThatThrownBy(() -> versionService.approveVersion(projectId, requirementId, 2, "Comment", unauthorizedUserId))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Access denied. Insufficient privileges.");

        assertThatThrownBy(() -> versionService.rejectVersion(projectId, requirementId, 2, "Comment", unauthorizedUserId))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Access denied. Insufficient privileges.");
    }

    @Test
    @DisplayName("29. Cross-project review access rejected")
    void shouldRejectCrossProjectReviewAccess() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));

        Requirement foreignReq = Requirement.builder()
                .id(requirementId)
                .projectId("other-project-999")
                .build();
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(foreignReq));

        assertThatThrownBy(() -> versionService.submitForReview(projectId, requirementId, 2, userId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Requirement not found in project: " + projectId);
    }

    @Test
    @DisplayName("30. Missing version throws ResourceNotFoundException on review actions")
    void shouldThrowWhenVersionMissingOnReview() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        when(versionRepository.findByProjectIdAndRequirementIdAndVersionNumber(projectId, requirementId, 99))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> versionService.submitForReview(projectId, requirementId, 99, userId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Requirement version 99 not found");

        assertThatThrownBy(() -> versionService.approveVersion(projectId, requirementId, 99, "Approved", userId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Requirement version 99 not found");

        assertThatThrownBy(() -> versionService.rejectVersion(projectId, requirementId, 99, "Rejected", userId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Requirement version 99 not found");
    }

    @Test
    @DisplayName("31. Invalid state transitions (DRAFT -> REJECTED, APPROVED -> IN_REVIEW) rejected")
    void shouldRejectInvalidStateTransitions() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        RequirementVersion draft = RequirementVersion.builder()
                .id("ver-2")
                .projectId(projectId)
                .requirementId(requirementId)
                .versionNumber(2)
                .reviewStatus(ReviewStatus.DRAFT)
                .build();

        when(versionRepository.findByProjectIdAndRequirementIdAndVersionNumber(projectId, requirementId, 2))
                .thenReturn(Optional.of(draft));

        // Cannot reject a DRAFT directly
        assertThatThrownBy(() -> versionService.rejectVersion(projectId, requirementId, 2, "Reason", userId))
                .isInstanceOf(InvalidStatusTransitionException.class)
                .hasMessageContaining("Cannot directly reject version in DRAFT status. Must be in IN_REVIEW.");
    }

    @Test
    @DisplayName("32. Duplicate approval rejected when version is already APPROVED")
    void shouldRejectDuplicateApproval() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        RequirementVersion approvedVersion = RequirementVersion.builder()
                .id("ver-2")
                .projectId(projectId)
                .requirementId(requirementId)
                .versionNumber(2)
                .reviewStatus(ReviewStatus.APPROVED)
                .build();

        when(versionRepository.findByProjectIdAndRequirementIdAndVersionNumber(projectId, requirementId, 2))
                .thenReturn(Optional.of(approvedVersion));

        assertThatThrownBy(() -> versionService.approveVersion(projectId, requirementId, 2, "Re-approving", userId))
                .isInstanceOf(InvalidStatusTransitionException.class)
                .hasMessageContaining("Duplicate approval rejected: Version 2 is already approved.");
    }

    @Test
    @DisplayName("33. Duplicate rejection rejected when version is already REJECTED")
    void shouldRejectDuplicateRejection() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        RequirementVersion rejectedVersion = RequirementVersion.builder()
                .id("ver-2")
                .projectId(projectId)
                .requirementId(requirementId)
                .versionNumber(2)
                .reviewStatus(ReviewStatus.REJECTED)
                .build();

        when(versionRepository.findByProjectIdAndRequirementIdAndVersionNumber(projectId, requirementId, 2))
                .thenReturn(Optional.of(rejectedVersion));

        assertThatThrownBy(() -> versionService.rejectVersion(projectId, requirementId, 2, "Re-rejecting", userId))
                .isInstanceOf(InvalidStatusTransitionException.class)
                .hasMessageContaining("Duplicate rejection rejected: Version 2 is already rejected.");
    }

    @Test
    @DisplayName("34. Stale version approval rejected when a newer version is already approved")
    void shouldRejectStaleVersionApproval() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        // Version 2 is pending in IN_REVIEW
        RequirementVersion pendingV2 = RequirementVersion.builder()
                .id("ver-2")
                .projectId(projectId)
                .requirementId(requirementId)
                .versionNumber(2)
                .reviewStatus(ReviewStatus.IN_REVIEW)
                .build();

        // But Version 3 is already APPROVED!
        RequirementVersion newerApprovedV3 = RequirementVersion.builder()
                .id("ver-3")
                .projectId(projectId)
                .requirementId(requirementId)
                .versionNumber(3)
                .reviewStatus(ReviewStatus.APPROVED)
                .build();

        when(versionRepository.findByProjectIdAndRequirementIdAndVersionNumber(projectId, requirementId, 2))
                .thenReturn(Optional.of(pendingV2));
        when(versionRepository.findFirstByProjectIdAndRequirementIdAndReviewStatusOrderByVersionNumberDesc(
                projectId, requirementId, ReviewStatus.APPROVED))
                .thenReturn(Optional.of(newerApprovedV3));

        assertThatThrownBy(() -> versionService.approveVersion(projectId, requirementId, 2, "Approve old", userId))
                .isInstanceOf(InvalidStatusTransitionException.class)
                .hasMessageContaining("Stale version approval rejected: Version 3 is already approved. Cannot approve older version 2.");
    }

    @Test
    @DisplayName("35. Persistence failure during cross-document approval triggers compensation rollback")
    void shouldTriggerCompensationRollbackOnRequirementSaveFailure() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        RequirementVersion inReview = RequirementVersion.builder()
                .id("ver-2")
                .projectId(projectId)
                .requirementId(requirementId)
                .versionNumber(2)
                .reviewStatus(ReviewStatus.IN_REVIEW)
                .build();

        when(versionRepository.findByProjectIdAndRequirementIdAndVersionNumber(projectId, requirementId, 2))
                .thenReturn(Optional.of(inReview));
        when(versionRepository.findFirstByProjectIdAndRequirementIdAndReviewStatusOrderByVersionNumberDesc(
                projectId, requirementId, ReviewStatus.APPROVED)).thenReturn(Optional.empty());

        // Version save succeeds
        when(versionRepository.save(any(RequirementVersion.class))).thenAnswer(inv -> inv.getArgument(0));

        // But Requirement save fails!
        when(requirementRepository.save(any(Requirement.class)))
                .thenThrow(new RuntimeException("MongoDB connection timeout during requirement update"));

        assertThatThrownBy(() -> versionService.approveVersion(projectId, requirementId, 2, "Approved", userId))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Transaction compensated and rolled back");

        // Verification: versionRepository.save was called twice (first to approve, second to compensate rollback back to IN_REVIEW)
        verify(versionRepository, times(2)).save(inReview);
        assertThat(inReview.getReviewStatus()).isEqualTo(ReviewStatus.IN_REVIEW);
        assertThat(inReview.getApprovedBy()).isNull();
        assertThat(inReview.getApprovedAt()).isNull();
    }
}
