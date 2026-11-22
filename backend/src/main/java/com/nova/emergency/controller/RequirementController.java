package com.nova.emergency.controller;

import com.nova.emergency.dto.*;
import com.nova.emergency.model.User;
import com.nova.emergency.repository.UserRepository;
import com.nova.emergency.service.RequirementService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/requirements")
public class RequirementController {

    private static final Logger log = LoggerFactory.getLogger(RequirementController.class);

    private final RequirementService requirementService;
    private final UserRepository userRepository;

    public RequirementController(RequirementService requirementService, UserRepository userRepository) {
        this.requirementService = requirementService;
        this.userRepository = userRepository;
    }

    private User resolveAuthenticatedUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equalsIgnoreCase(auth.getName())) {
            throw new BadCredentialsException("Authentication required. Please log in.");
        }
        String principal = auth.getName();
        return userRepository.findByEmail(principal.toLowerCase().trim())
                .or(() -> userRepository.findById(principal))
                .orElseThrow(() -> new AccessDeniedException("User account not found for authenticated principal."));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RequirementResponse>> createRequirement(
            @PathVariable String projectId,
            @Valid @RequestBody CreateRequirementRequest request,
            Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        RequirementResponse created = requirementService.createRequirement(projectId, request, user.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(created, "Requirement created successfully"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RequirementResponse>>> listRequirements(
            @PathVariable String projectId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize,
            Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        List<RequirementResponse> requirements = requirementService.getRequirements(
                projectId, status, priority, type, search, page, pageSize, user.getId());
        long total = requirementService.countRequirements(
                projectId, status, priority, type, search, user.getId());

        ApiResponse<List<RequirementResponse>> response = ApiResponse.ok(requirements);
        response.setMeta(new ApiResponse.Meta(total, page, pageSize));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{requirementId}")
    public ResponseEntity<ApiResponse<RequirementResponse>> getRequirement(
            @PathVariable String projectId,
            @PathVariable String requirementId,
            Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        RequirementResponse requirement = requirementService.getRequirement(projectId, requirementId, user.getId());
        return ResponseEntity.ok(ApiResponse.ok(requirement));
    }

    @PutMapping("/{requirementId}")
    public ResponseEntity<ApiResponse<RequirementResponse>> updateRequirement(
            @PathVariable String projectId,
            @PathVariable String requirementId,
            @Valid @RequestBody UpdateRequirementRequest request,
            Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        RequirementResponse updated = requirementService.updateRequirement(projectId, requirementId, request, user.getId());
        return ResponseEntity.ok(ApiResponse.ok(updated, "Requirement updated successfully"));
    }

    @PatchMapping("/{requirementId}/status")
    public ResponseEntity<ApiResponse<RequirementResponse>> updateStatus(
            @PathVariable String projectId,
            @PathVariable String requirementId,
            @Valid @RequestBody UpdateRequirementStatusRequest request,
            Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        RequirementResponse updated = requirementService.updateStatus(projectId, requirementId, request.getStatus(), user.getId());
        return ResponseEntity.ok(ApiResponse.ok(updated, "Requirement status updated successfully"));
    }

    @DeleteMapping("/{requirementId}")
    public ResponseEntity<ApiResponse<RequirementResponse>> deleteRequirement(
            @PathVariable String projectId,
            @PathVariable String requirementId,
            Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        RequirementResponse deleted = requirementService.deleteRequirement(projectId, requirementId, user.getId());
        return ResponseEntity.ok(ApiResponse.ok(deleted, "Requirement deleted successfully"));
    }
}
