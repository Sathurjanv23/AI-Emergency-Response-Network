package com.nova.emergency.controller;

import com.nova.emergency.dto.ApiResponse;
import com.nova.emergency.dto.CreateProjectRequest;
import com.nova.emergency.dto.ProjectResponse;
import com.nova.emergency.dto.UpdateProjectRequest;
import com.nova.emergency.model.User;
import com.nova.emergency.repository.UserRepository;
import com.nova.emergency.service.ProjectService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(ProjectController.class);

    private final ProjectService projectService;
    private final UserRepository userRepository;

    public ProjectController(ProjectService projectService, UserRepository userRepository) {
        this.projectService = projectService;
        this.userRepository = userRepository;
    }

    private User resolveAuthenticatedUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equalsIgnoreCase(auth.getName())) {
            throw new BadCredentialsException("Authentication required. Please log in.");
        }
        String email = auth.getName();
        return userRepository.findByEmail(email.toLowerCase().trim())
                .orElseThrow(() -> new AccessDeniedException("User account not found for authenticated principal."));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProjectResponse>> createProject(
            @Valid @RequestBody CreateProjectRequest request,
            Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        ProjectResponse created = projectService.createProject(request, user.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(created, "Project created successfully"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProjectResponse>>> listProjects(
            @RequestParam(required = false) String status,
            Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        List<ProjectResponse> projects = projectService.getAccessibleProjects(user.getId(), status);
        ApiResponse<List<ProjectResponse>> response = ApiResponse.ok(projects);
        response.setMeta(new ApiResponse.Meta((long) projects.size(), null, null));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProjectResponse>> getProjectById(
            @PathVariable String id,
            Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        ProjectResponse project = projectService.getProjectById(id, user.getId());
        return ResponseEntity.ok(ApiResponse.ok(project));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProjectResponse>> updateProject(
            @PathVariable String id,
            @Valid @RequestBody UpdateProjectRequest request,
            Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        ProjectResponse updated = projectService.updateProject(id, request, user.getId());
        return ResponseEntity.ok(ApiResponse.ok(updated, "Project updated successfully"));
    }

    @PatchMapping("/{id}/archive")
    public ResponseEntity<ApiResponse<ProjectResponse>> archiveProject(
            @PathVariable String id,
            Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        ProjectResponse archived = projectService.archiveProject(id, user.getId());
        return ResponseEntity.ok(ApiResponse.ok(archived, "Project archived successfully"));
    }
}
