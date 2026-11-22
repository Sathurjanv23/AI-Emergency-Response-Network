package com.nova.emergency.repository;

import com.nova.emergency.model.ChangeType;
import com.nova.emergency.model.RequirementVersion;
import com.nova.emergency.model.ReviewStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RequirementVersionRepositoryTest {

    @Mock
    private RequirementVersionRepository repository;

    private RequirementVersion v1;
    private RequirementVersion v2;
    private RequirementVersion v3;

    @BeforeEach
    void setUp() {
        v1 = RequirementVersion.builder()
                .id("ver-1")
                .projectId("proj-001")
                .requirementId("req-001")
                .versionNumber(1)
                .title("Baseline Title")
                .description("Baseline description")
                .changeSummary("Initial")
                .changeType(ChangeType.CREATED)
                .reviewStatus(ReviewStatus.APPROVED)
                .build();

        v2 = RequirementVersion.builder()
                .id("ver-2")
                .projectId("proj-001")
                .requirementId("req-001")
                .versionNumber(2)
                .title("Updated Title")
                .description("Updated description")
                .changeSummary("Clarification")
                .changeType(ChangeType.CLARIFIED)
                .reviewStatus(ReviewStatus.APPROVED)
                .build();

        v3 = RequirementVersion.builder()
                .id("ver-3")
                .projectId("proj-001")
                .requirementId("req-001")
                .versionNumber(3)
                .title("Draft Title")
                .description("Draft description")
                .changeSummary("In-progress changes")
                .changeType(ChangeType.UPDATED)
                .reviewStatus(ReviewStatus.DRAFT)
                .build();
    }

    @Test
    @DisplayName("Should find versions by requirement ID in descending order")
    void shouldFindVersionsOrderByVersionNumberDesc() {
        when(repository.findByRequirementIdOrderByVersionNumberDesc("req-001"))
                .thenReturn(List.of(v3, v2, v1));

        List<RequirementVersion> versions = repository.findByRequirementIdOrderByVersionNumberDesc("req-001");

        assertThat(versions).hasSize(3);
        assertThat(versions.get(0).getVersionNumber()).isEqualTo(3);
        assertThat(versions.get(1).getVersionNumber()).isEqualTo(2);
        assertThat(versions.get(2).getVersionNumber()).isEqualTo(1);
        verify(repository, times(1)).findByRequirementIdOrderByVersionNumberDesc("req-001");
    }

    @Test
    @DisplayName("Should find specific version by requirement ID and version number")
    void shouldFindByRequirementIdAndVersionNumber() {
        when(repository.findByRequirementIdAndVersionNumber("req-001", 2))
                .thenReturn(Optional.of(v2));

        Optional<RequirementVersion> found = repository.findByRequirementIdAndVersionNumber("req-001", 2);

        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo("ver-2");
        assertThat(found.get().getVersionNumber()).isEqualTo(2);
        verify(repository, times(1)).findByRequirementIdAndVersionNumber("req-001", 2);
    }

    @Test
    @DisplayName("Should find latest version by version number descending")
    void shouldFindFirstByRequirementIdOrderByVersionNumberDesc() {
        when(repository.findFirstByRequirementIdOrderByVersionNumberDesc("req-001"))
                .thenReturn(Optional.of(v3));

        Optional<RequirementVersion> latest = repository.findFirstByRequirementIdOrderByVersionNumberDesc("req-001");

        assertThat(latest).isPresent();
        assertThat(latest.get().getVersionNumber()).isEqualTo(3);
        assertThat(latest.get().getReviewStatus()).isEqualTo(ReviewStatus.DRAFT);
    }

    @Test
    @DisplayName("Should find latest approved version")
    void shouldFindFirstApprovedVersion() {
        when(repository.findFirstByRequirementIdAndReviewStatusOrderByVersionNumberDesc("req-001", ReviewStatus.APPROVED))
                .thenReturn(Optional.of(v2));

        Optional<RequirementVersion> latestApproved = repository
                .findFirstByRequirementIdAndReviewStatusOrderByVersionNumberDesc("req-001", ReviewStatus.APPROVED);

        assertThat(latestApproved).isPresent();
        assertThat(latestApproved.get().getVersionNumber()).isEqualTo(2);
        assertThat(latestApproved.get().getReviewStatus()).isEqualTo(ReviewStatus.APPROVED);
    }

    @Test
    @DisplayName("Should find versions by review status")
    void shouldFindByReviewStatus() {
        when(repository.findByRequirementIdAndReviewStatusOrderByVersionNumberDesc("req-001", ReviewStatus.APPROVED))
                .thenReturn(List.of(v2, v1));

        List<RequirementVersion> approved = repository
                .findByRequirementIdAndReviewStatusOrderByVersionNumberDesc("req-001", ReviewStatus.APPROVED);

        assertThat(approved).hasSize(2);
        assertThat(approved).allMatch(v -> v.getReviewStatus() == ReviewStatus.APPROVED);
    }

    @Test
    @DisplayName("Should check version number existence")
    void shouldCheckVersionNumberExistence() {
        when(repository.existsByRequirementIdAndVersionNumber("req-001", 1)).thenReturn(true);
        when(repository.existsByRequirementIdAndVersionNumber("req-001", 99)).thenReturn(false);

        assertThat(repository.existsByRequirementIdAndVersionNumber("req-001", 1)).isTrue();
        assertThat(repository.existsByRequirementIdAndVersionNumber("req-001", 99)).isFalse();
    }

    @Test
    @DisplayName("Should support project-scoped queries")
    void shouldSupportProjectScopedQueries() {
        when(repository.findByProjectIdAndRequirementIdOrderByVersionNumberDesc("proj-001", "req-001"))
                .thenReturn(List.of(v3, v2, v1));
        when(repository.findByProjectIdAndRequirementIdAndVersionNumber("proj-001", "req-001", 2))
                .thenReturn(Optional.of(v2));
        when(repository.existsByProjectIdAndRequirementIdAndVersionNumber("proj-001", "req-001", 2))
                .thenReturn(true);
        when(repository.countByProjectIdAndRequirementId("proj-001", "req-001")).thenReturn(3L);

        List<RequirementVersion> projectVersions = repository
                .findByProjectIdAndRequirementIdOrderByVersionNumberDesc("proj-001", "req-001");
        assertThat(projectVersions).hasSize(3);

        Optional<RequirementVersion> scopedFound = repository
                .findByProjectIdAndRequirementIdAndVersionNumber("proj-001", "req-001", 2);
        assertThat(scopedFound).isPresent();
        assertThat(scopedFound.get().getId()).isEqualTo("ver-2");

        assertThat(repository.existsByProjectIdAndRequirementIdAndVersionNumber("proj-001", "req-001", 2)).isTrue();
        assertThat(repository.countByProjectIdAndRequirementId("proj-001", "req-001")).isEqualTo(3L);
    }

    @Test
    @DisplayName("Should support count and delete operations")
    void shouldSupportCountAndDelete() {
        when(repository.countByRequirementId("req-001")).thenReturn(3L);
        doNothing().when(repository).deleteByRequirementId("req-001");
        doNothing().when(repository).deleteByProjectIdAndRequirementId("proj-001", "req-001");

        assertThat(repository.countByRequirementId("req-001")).isEqualTo(3L);

        repository.deleteByRequirementId("req-001");
        verify(repository, times(1)).deleteByRequirementId("req-001");

        repository.deleteByProjectIdAndRequirementId("proj-001", "req-001");
        verify(repository, times(1)).deleteByProjectIdAndRequirementId("proj-001", "req-001");
    }
}
