package com.nova.emergency.service;

import com.nova.emergency.dto.CreateProjectRequest;
import com.nova.emergency.dto.ProjectResponse;
import com.nova.emergency.dto.UpdateProjectRequest;
import com.nova.emergency.exception.ResourceNotFoundException;
import com.nova.emergency.model.Project;
import com.nova.emergency.repository.ProjectRepository;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @InjectMocks
    private ProjectService projectService;

    private Project sampleProject;
    private final String userId = "user-123";
    private final String otherUserId = "user-999";
    private final String projectId = "proj-001";

    @BeforeEach
    void setUp() {
        sampleProject = Project.builder()
                .id(projectId)
                .name("ReqTrace Demo Project")
                .description("Software requirement intelligence platform")
                .ownerId(userId)
                .status(Project.STATUS_ACTIVE)
                .createdAt(Instant.now().toString())
                .updatedAt(Instant.now().toString())
                .build();
    }

    @Test
    @DisplayName("Service Test: Successful project creation")
    void testCreateProjectSuccess() {
        CreateProjectRequest request = new CreateProjectRequest("ReqTrace Core", "Core requirement engine");
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> {
            Project p = invocation.getArgument(0);
            p.setId(projectId);
            return p;
        });

        ProjectResponse response = projectService.createProject(request, userId);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(projectId);
        assertThat(response.getName()).isEqualTo("ReqTrace Core");
        assertThat(response.getDescription()).isEqualTo("Core requirement engine");
        assertThat(response.getOwnerId()).isEqualTo(userId);
        assertThat(response.getStatus()).isEqualTo(Project.STATUS_ACTIVE);
        assertThat(response.getCreatedAt()).isNotBlank();
        verify(projectRepository, times(1)).save(any(Project.class));
    }

    @Test
    @DisplayName("Service Test: Creation fails when project name is missing or blank")
    void testCreateProjectMissingNameThrowsException() {
        CreateProjectRequest request = new CreateProjectRequest("   ", "Empty name project");

        assertThatThrownBy(() -> projectService.createProject(request, userId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Project name is required");

        verify(projectRepository, never()).save(any());
    }

    @Test
    @DisplayName("Service Test: Listing the current user's projects")
    void testListCurrentUserProjects() {
        when(projectRepository.findByOwnerIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of(sampleProject));

        List<ProjectResponse> projects = projectService.getAccessibleProjects(userId, null);

        assertThat(projects).hasSize(1);
        assertThat(projects.get(0).getName()).isEqualTo("ReqTrace Demo Project");
        assertThat(projects.get(0).getOwnerId()).isEqualTo(userId);
        verify(projectRepository, times(1)).findByOwnerIdOrderByCreatedAtDesc(userId);
    }

    @Test
    @DisplayName("Service Test: Listing user's projects filtered by status")
    void testListUserProjectsWithStatusFilter() {
        when(projectRepository.findByOwnerIdAndStatusOrderByCreatedAtDesc(userId, "ACTIVE"))
                .thenReturn(List.of(sampleProject));

        List<ProjectResponse> projects = projectService.getAccessibleProjects(userId, "ACTIVE");

        assertThat(projects).hasSize(1);
        verify(projectRepository, times(1)).findByOwnerIdAndStatusOrderByCreatedAtDesc(userId, "ACTIVE");
    }

    @Test
    @DisplayName("Service Test: Retrieving an existing project by owner")
    void testGetProjectByIdSuccess() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));

        ProjectResponse response = projectService.getProjectById(projectId, userId);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(projectId);
        assertThat(response.getOwnerId()).isEqualTo(userId);
    }

    @Test
    @DisplayName("Service Test: Unknown project ID throws ResourceNotFoundException")
    void testGetProjectByIdNotFound() {
        when(projectRepository.findById("unknown-id")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.getProjectById("unknown-id", userId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Project not found with id: unknown-id");
    }

    @Test
    @DisplayName("Service Test: Attempted access to another user's project throws AccessDeniedException")
    void testGetProjectByIdAccessDenied() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));

        assertThatThrownBy(() -> projectService.getProjectById(projectId, otherUserId))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Access denied");
    }

    @Test
    @DisplayName("Service Test: Updating a project by owner")
    void testUpdateProjectSuccess() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateProjectRequest updateReq = new UpdateProjectRequest("Updated ReqTrace", "Updated description", "ACTIVE");
        ProjectResponse response = projectService.updateProject(projectId, updateReq, userId);

        assertThat(response.getName()).isEqualTo("Updated ReqTrace");
        assertThat(response.getDescription()).isEqualTo("Updated description");
        verify(projectRepository, times(1)).save(sampleProject);
    }

    @Test
    @DisplayName("Service Test: Updating another user's project throws AccessDeniedException")
    void testUpdateProjectAccessDenied() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));

        UpdateProjectRequest updateReq = new UpdateProjectRequest("Hacked Project", "Hacked", "ACTIVE");
        assertThatThrownBy(() -> projectService.updateProject(projectId, updateReq, otherUserId))
                .isInstanceOf(AccessDeniedException.class);

        verify(projectRepository, never()).save(any());
    }

    @Test
    @DisplayName("Service Test: Archiving a project by owner")
    void testArchiveProjectSuccess() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProjectResponse response = projectService.archiveProject(projectId, userId);

        assertThat(response.getStatus()).isEqualTo(Project.STATUS_ARCHIVED);
        assertThat(sampleProject.getStatus()).isEqualTo(Project.STATUS_ARCHIVED);
        verify(projectRepository, times(1)).save(sampleProject);
    }

    @Test
    @DisplayName("Service Test: Archiving another user's project throws AccessDeniedException")
    void testArchiveProjectAccessDenied() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));

        assertThatThrownBy(() -> projectService.archiveProject(projectId, otherUserId))
                .isInstanceOf(AccessDeniedException.class);

        verify(projectRepository, never()).save(any());
    }
}
