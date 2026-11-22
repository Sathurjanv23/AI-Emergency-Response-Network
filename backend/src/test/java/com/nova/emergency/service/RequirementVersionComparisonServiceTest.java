package com.nova.emergency.service;

import com.nova.emergency.dto.FieldComparison;
import com.nova.emergency.dto.RequirementVersionComparisonResponse;
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
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RequirementVersionComparisonServiceTest {

    @Mock
    private RequirementVersionRepository versionRepository;

    @Mock
    private RequirementRepository requirementRepository;

    @Mock
    private ProjectRepository projectRepository;

    @InjectMocks
    private RequirementVersionComparisonService comparisonService;

    private Project testProject;
    private Requirement testRequirement;
    private RequirementVersion version1;
    private RequirementVersion version2;

    @BeforeEach
    void setUp() {
        testProject = new Project();
        testProject.setId("proj-001");
        testProject.setOwnerId("user-123");

        testRequirement = Requirement.builder()
                .id("req-001")
                .projectId("proj-001")
                .requirementKey("REQ-001")
                .title("Secure User Login")
                .description("Users can log in.")
                .status(Requirement.STATUS_APPROVED)
                .build();

        version1 = RequirementVersion.builder()
                .id("ver-001")
                .projectId("proj-001")
                .requirementId("req-001")
                .versionNumber(1)
                .title("User Login")
                .description("Users can log in.")
                .changeSummary("Initial baseline")
                .changeType(ChangeType.CREATED)
                .reviewStatus(ReviewStatus.APPROVED)
                .createdBy("user-123")
                .createdAt(Instant.now().toString())
                .build();

        version2 = RequirementVersion.builder()
                .id("ver-002")
                .projectId("proj-001")
                .requirementId("req-001")
                .versionNumber(2)
                .title("Secure User Login")
                .description("Users can securely log in.")
                .changeSummary("Enhanced authentication security")
                .changeType(ChangeType.UPDATED)
                .reviewStatus(ReviewStatus.IN_REVIEW)
                .createdBy("user-123")
                .createdAt(Instant.now().toString())
                .build();
    }

    @Test
    @DisplayName("Comparison Test 16: Identical versions report no changes and all unchanged fields")
    void testIdenticalVersions() {
        RequirementVersion vClone = RequirementVersion.builder()
                .id("ver-clone")
                .projectId(version1.getProjectId())
                .requirementId(version1.getRequirementId())
                .versionNumber(1)
                .title(version1.getTitle())
                .description(version1.getDescription())
                .changeType(version1.getChangeType())
                .reviewStatus(version1.getReviewStatus())
                .build();

        RequirementVersionComparisonResponse res = comparisonService.compare(version1, vClone);

        assertThat(res.isHasChanges()).isFalse();
        assertThat(res.getChangedFields()).isEmpty();
        assertThat(res.getUnchangedFields()).containsExactlyInAnyOrder("title", "description", "changeType", "reviewStatus");
    }

    @Test
    @DisplayName("Comparison Test 17: Changed title is detected with added words and oldValue/newValue")
    void testChangedTitle() {
        RequirementVersion vA = RequirementVersion.builder()
                .requirementId("req-001")
                .versionNumber(1)
                .title("User Login")
                .description("Same desc")
                .changeType(ChangeType.CREATED)
                .reviewStatus(ReviewStatus.APPROVED)
                .build();

        RequirementVersion vB = RequirementVersion.builder()
                .requirementId("req-001")
                .versionNumber(2)
                .title("Secure User Login")
                .description("Same desc")
                .changeType(ChangeType.CREATED)
                .reviewStatus(ReviewStatus.APPROVED)
                .build();

        RequirementVersionComparisonResponse res = comparisonService.compare(vA, vB);

        assertThat(res.isHasChanges()).isTrue();
        assertThat(res.getChangedFields()).hasSize(1);
        FieldComparison titleComp = res.getChangedFields().get(0);
        assertThat(titleComp.getField()).isEqualTo("title");
        assertThat(titleComp.getOldValue()).isEqualTo("User Login");
        assertThat(titleComp.getNewValue()).isEqualTo("Secure User Login");
        assertThat(titleComp.getAddedText()).containsExactly("Secure");
        assertThat(titleComp.getRemovedText()).isEmpty();
        assertThat(res.getUnchangedFields()).contains("description", "changeType", "reviewStatus");
    }

    @Test
    @DisplayName("Comparison Test 18: Changed description is detected with detailed diff")
    void testChangedDescription() {
        RequirementVersionComparisonResponse res = comparisonService.compare(version1, version2);

        assertThat(res.isHasChanges()).isTrue();
        FieldComparison descComp = res.getChangedFields().stream()
                .filter(f -> "description".equals(f.getField()))
                .findFirst()
                .orElseThrow();

        assertThat(descComp.getOldValue()).isEqualTo("Users can log in.");
        assertThat(descComp.getNewValue()).isEqualTo("Users can securely log in.");
    }

    @Test
    @DisplayName("Comparison Test 19: Added words are accurately extracted by LCS algorithm")
    void testAddedWords() {
        RequirementVersion vA = RequirementVersion.builder()
                .requirementId("req-001")
                .versionNumber(1)
                .title("Title")
                .description("Users can log in.")
                .build();

        RequirementVersion vB = RequirementVersion.builder()
                .requirementId("req-001")
                .versionNumber(2)
                .title("Title")
                .description("Users can securely log in.")
                .build();

        RequirementVersionComparisonResponse res = comparisonService.compare(vA, vB);
        FieldComparison descComp = res.getChangedFields().get(0);
        assertThat(descComp.getAddedText()).containsExactly("securely");
        assertThat(descComp.getRemovedText()).isEmpty();
    }

    @Test
    @DisplayName("Comparison Test 20: Removed words are accurately identified")
    void testRemovedWords() {
        RequirementVersion vA = RequirementVersion.builder()
                .requirementId("req-001")
                .versionNumber(1)
                .title("Title")
                .description("Users can securely and quickly log in.")
                .build();

        RequirementVersion vB = RequirementVersion.builder()
                .requirementId("req-001")
                .versionNumber(2)
                .title("Title")
                .description("Users can log in.")
                .build();

        RequirementVersionComparisonResponse res = comparisonService.compare(vA, vB);
        FieldComparison descComp = res.getChangedFields().get(0);
        assertThat(descComp.getRemovedText()).containsExactly("securely", "and", "quickly");
        assertThat(descComp.getAddedText()).isEmpty();
    }

    @Test
    @DisplayName("Comparison Test 21: Whitespace differences are captured without false word diffs")
    void testWhitespaceDifferences() {
        RequirementVersion vA = RequirementVersion.builder()
                .requirementId("req-001")
                .versionNumber(1)
                .title("Title")
                .description("Users  can   log   in.")
                .build();

        RequirementVersion vB = RequirementVersion.builder()
                .requirementId("req-001")
                .versionNumber(2)
                .title("Title")
                .description("Users can log in.")
                .build();

        RequirementVersionComparisonResponse res = comparisonService.compare(vA, vB);
        assertThat(res.isHasChanges()).isTrue();
        FieldComparison descComp = res.getChangedFields().get(0);
        assertThat(descComp.getOldValue()).isEqualTo("Users  can   log   in.");
        assertThat(descComp.getNewValue()).isEqualTo("Users can log in.");
        // Words are identical, so token added/removed lists are empty
        assertThat(descComp.getAddedText()).isEmpty();
        assertThat(descComp.getRemovedText()).isEmpty();
    }

    @Test
    @DisplayName("Comparison Test 22: Unicode and international multilingual characters diff correctly")
    void testUnicodeText() {
        RequirementVersion vA = RequirementVersion.builder()
                .requirementId("req-001")
                .versionNumber(1)
                .title("Title")
                .description("பயனர் உள்நுழைய முடியும்")
                .build();

        RequirementVersion vB = RequirementVersion.builder()
                .requirementId("req-001")
                .versionNumber(2)
                .title("Title")
                .description("பயனர் பாதுகாப்பாக உள்நுழைய முடியும்")
                .build();

        RequirementVersionComparisonResponse res = comparisonService.compare(vA, vB);
        FieldComparison descComp = res.getChangedFields().get(0);
        assertThat(descComp.getAddedText()).containsExactly("பாதுகாப்பாக");
        assertThat(descComp.getRemovedText()).isEmpty();
    }

    @Test
    @DisplayName("Comparison Test 23: Long descriptions within validated size limits diff efficiently")
    void testLongDescriptions() {
        StringBuilder sbA = new StringBuilder();
        StringBuilder sbB = new StringBuilder();
        for (int i = 1; i <= 300; i++) {
            sbA.append("word").append(i).append(" ");
            if (i == 150) {
                sbB.append("insertedWord ");
            }
            if (i != 200) {
                sbB.append("word").append(i).append(" ");
            }
        }

        RequirementVersion vA = RequirementVersion.builder()
                .requirementId("req-001")
                .versionNumber(1)
                .title("Title")
                .description(sbA.toString().trim())
                .build();

        RequirementVersion vB = RequirementVersion.builder()
                .requirementId("req-001")
                .versionNumber(2)
                .title("Title")
                .description(sbB.toString().trim())
                .build();

        RequirementVersionComparisonResponse res = comparisonService.compare(vA, vB);
        FieldComparison descComp = res.getChangedFields().get(0);
        assertThat(descComp.getAddedText()).containsExactly("insertedWord");
        assertThat(descComp.getRemovedText()).containsExactly("word200");
    }

    @Test
    @DisplayName("Comparison Test 24: Missing comparison version throws ResourceNotFoundException")
    void testMissingComparisonVersion() {
        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(requirementRepository.findById("req-001")).thenReturn(Optional.of(testRequirement));
        when(versionRepository.findByProjectIdAndRequirementIdAndVersionNumber("proj-001", "req-001", 1))
                .thenReturn(Optional.of(version1));
        when(versionRepository.findByProjectIdAndRequirementIdAndVersionNumber("proj-001", "req-001", 99))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> comparisonService.compareVersions("proj-001", "req-001", 1, 99, "user-123"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Requirement version 99 not found");
    }

    @Test
    @DisplayName("Comparison Test 25: No mutation of historical snapshots during comparison")
    void testNoMutationOfHistoricalSnapshots() {
        String originalV1Title = version1.getTitle();
        String originalV1Desc = version1.getDescription();
        ChangeType originalV1ChangeType = version1.getChangeType();
        ReviewStatus originalV1Status = version1.getReviewStatus();

        String originalV2Title = version2.getTitle();
        String originalV2Desc = version2.getDescription();
        ChangeType originalV2ChangeType = version2.getChangeType();
        ReviewStatus originalV2Status = version2.getReviewStatus();

        comparisonService.compare(version1, version2);

        assertThat(version1.getTitle()).isEqualTo(originalV1Title);
        assertThat(version1.getDescription()).isEqualTo(originalV1Desc);
        assertThat(version1.getChangeType()).isEqualTo(originalV1ChangeType);
        assertThat(version1.getReviewStatus()).isEqualTo(originalV1Status);

        assertThat(version2.getTitle()).isEqualTo(originalV2Title);
        assertThat(version2.getDescription()).isEqualTo(originalV2Desc);
        assertThat(version2.getChangeType()).isEqualTo(originalV2ChangeType);
        assertThat(version2.getReviewStatus()).isEqualTo(originalV2Status);

        verifyNoInteractions(versionRepository);
    }

    @Test
    @DisplayName("Comparison Test: Cross-project access throws ResourceNotFoundException")
    void testCrossProjectAccess() {
        Requirement foreignReq = Requirement.builder()
                .id("req-foreign")
                .projectId("other-proj")
                .build();

        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));
        when(requirementRepository.findById("req-foreign")).thenReturn(Optional.of(foreignReq));

        assertThatThrownBy(() -> comparisonService.compareVersions("proj-001", "req-foreign", 1, 2, "user-123"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Requirement not found in project");
    }

    @Test
    @DisplayName("Comparison Test: Unauthorized user throws AccessDeniedException")
    void testUnauthorizedUser() {
        when(projectRepository.findById("proj-001")).thenReturn(Optional.of(testProject));

        assertThatThrownBy(() -> comparisonService.compareVersions("proj-001", "req-001", 1, 2, "intruder-999"))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("Comparison Test: Invalid version parameters throw IllegalArgumentException")
    void testInvalidParameters() {
        assertThatThrownBy(() -> comparisonService.compareVersions("proj-001", "req-001", -1, 2, "user-123"))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> comparisonService.compareVersions("proj-001", "req-001", 1, 0, "user-123"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
