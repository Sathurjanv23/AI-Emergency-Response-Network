package com.nova.emergency.service;

import com.nova.emergency.dto.CreateProjectRequest;
import com.nova.emergency.dto.ProjectResponse;
import com.nova.emergency.dto.UpdateProjectRequest;
import com.nova.emergency.exception.ResourceNotFoundException;
import com.nova.emergency.model.Project;
import com.nova.emergency.repository.ProjectRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProjectService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(ProjectService.class);

    private final ProjectRepository projectRepository;

    public ProjectService(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    public ProjectResponse createProject(CreateProjectRequest request, String ownerId) {
        if (ownerId == null || ownerId.isBlank()) {
            throw new IllegalArgumentException("Project owner must be an authenticated user.");
        }
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Project name is required.");
        }

        String now = Instant.now().toString();
        Project project = Project.builder()
                .name(request.getName().trim())
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .ownerId(ownerId)
                .status(Project.STATUS_ACTIVE)
                .createdAt(now)
                .updatedAt(now)
                .build();

        Project saved = projectRepository.save(project);
        log.info("Project created: {} (id: {}) by user: {}", saved.getName(), saved.getId(), ownerId);
        return ProjectResponse.from(saved);
    }

    public List<ProjectResponse> getAccessibleProjects(String ownerId, String status) {
        if (ownerId == null || ownerId.isBlank()) {
            throw new IllegalArgumentException("Owner identifier is required.");
        }

        List<Project> projects;
        if (status != null && !status.trim().isEmpty()) {
            projects = projectRepository.findByOwnerIdAndStatusOrderByCreatedAtDesc(ownerId, status.trim().toUpperCase());
        } else {
            projects = projectRepository.findByOwnerIdOrderByCreatedAtDesc(ownerId);
        }

        return projects.stream()
                .map(ProjectResponse::from)
                .collect(Collectors.toList());
    }

    public ProjectResponse getProjectById(String id, String requestingUserId) {
        Project project = findProjectOrThrow(id);
        verifyOwnership(project, requestingUserId);
        return ProjectResponse.from(project);
    }

    public ProjectResponse updateProject(String id, UpdateProjectRequest request, String requestingUserId) {
        Project project = findProjectOrThrow(id);
        verifyOwnership(project, requestingUserId);

        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Project name is required.");
        }

        project.setName(request.getName().trim());
        if (request.getDescription() != null) {
            project.setDescription(request.getDescription().trim());
        }
        if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
            String updatedStatus = request.getStatus().trim().toUpperCase();
            if (!Project.STATUS_ACTIVE.equals(updatedStatus) && !Project.STATUS_ARCHIVED.equals(updatedStatus)) {
                throw new IllegalArgumentException("Invalid status: " + request.getStatus() + ". Must be ACTIVE or ARCHIVED.");
            }
            project.setStatus(updatedStatus);
        }
        project.setUpdatedAt(Instant.now().toString());

        Project saved = projectRepository.save(project);
        log.info("Project updated: {} (id: {}) by user: {}", saved.getName(), saved.getId(), requestingUserId);
        return ProjectResponse.from(saved);
    }

    public ProjectResponse archiveProject(String id, String requestingUserId) {
        Project project = findProjectOrThrow(id);
        verifyOwnership(project, requestingUserId);

        project.setStatus(Project.STATUS_ARCHIVED);
        project.setUpdatedAt(Instant.now().toString());

        Project saved = projectRepository.save(project);
        log.info("Project archived: {} (id: {}) by user: {}", saved.getName(), saved.getId(), requestingUserId);
        return ProjectResponse.from(saved);
    }

    private Project findProjectOrThrow(String id) {
        if (id == null || id.isBlank()) {
            throw new ResourceNotFoundException("Project not found with empty id.");
        }
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
    }

    private void verifyOwnership(Project project, String requestingUserId) {
        if (requestingUserId == null || !requestingUserId.equals(project.getOwnerId())) {
            log.warn("Unauthorized access attempt to project id {} by user {}", project.getId(), requestingUserId);
            throw new AccessDeniedException("Access denied. Insufficient privileges.");
        }
    }
}
