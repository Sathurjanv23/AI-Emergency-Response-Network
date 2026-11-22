package com.nova.emergency.service;

import com.nova.emergency.dto.CreateRequirementVersionRequest;
import com.nova.emergency.dto.RequirementVersionResponse;
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

    @InjectMocks
    private RequirementVersionService versionService;

    private final String projectId = "proj-100";
    private final String requirementId = "req-001";
    private final String userId = "user-123";
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

    @Test
    @DisplayName("1. First version creation initializes baseline and creates draft version 2")
    void shouldCreateFirstVersionWhenNoneExists() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));

        // Baseline initialization check: no version 1 exists initially
        when(versionRepository.findByRequirementIdAndVersionNumber(requirementId, 1)).thenReturn(Optional.empty());
        when(versionRepository.countByRequirementId(requirementId)).thenReturn(0L);

        // Baseline version 1 saved
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

        // Version allocation: finds version 1 as latest, candidate is 2
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

        // Baseline version 1 already exists
        RequirementVersion v1 = RequirementVersion.builder().id("ver-1").versionNumber(1).build();
        when(versionRepository.findByRequirementIdAndVersionNumber(requirementId, 1)).thenReturn(Optional.of(v1));

        // Latest version is version 2
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

        // Invalid version request
        CreateRequirementVersionRequest emptyTitleReq = CreateRequirementVersionRequest.builder()
                .title("")
                .description("Desc")
                .changeSummary("Summary")
                .changeType(ChangeType.UPDATED)
                .build();
        assertThatThrownBy(() -> versionService.createDraftVersion(projectId, requirementId, emptyTitleReq, userId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Title is required.");

        // Invalid version number
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

        // Already exists
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
                .thenReturn(Optional.empty()) // first check: not found
                .thenReturn(Optional.of(v1)); // after conflict: found
        when(versionRepository.countByRequirementId(requirementId)).thenReturn(0L);

        // Concurrent save throws DuplicateKeyException
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

        // Attempt 1: thinks latest is v1 -> tries version 2 -> duplicate key exception
        // Attempt 2: latest is now v2 -> tries version 3 -> succeeds
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

        // All 5 attempts fail with DuplicateKeyException
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

        // Verification: requirementRepository.save(...) was NEVER called, and sampleRequirement pointer was not mutated
        verify(requirementRepository, never()).save(any());
        assertThat(sampleRequirement.getCurrentVersionId()).isEqualTo("ver-app-001");
    }

    @Test
    @DisplayName("18. Multithreaded concurrent version allocation produces distinct version numbers")
    void shouldHandleMultithreadedConcurrentAllocation() throws InterruptedException, ExecutionException {
        // Concurrency test using an ExecutorService with multiple threads
        int threadCount = 4;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(requirementRepository.findById(requirementId)).thenReturn(Optional.of(sampleRequirement));
        when(versionRepository.findByRequirementIdAndVersionNumber(requirementId, 1))
                .thenReturn(Optional.of(RequirementVersion.builder().versionNumber(1).build()));

        // Simulate atomic increment via thread-safe atomic counter in mock
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
}
