package com.nova.emergency.controller;

import com.nova.emergency.dto.*;
import com.nova.emergency.model.User;
import com.nova.emergency.repository.UserRepository;
import com.nova.emergency.service.RequirementVersionComparisonService;
import com.nova.emergency.service.RequirementVersionService;
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
@RequestMapping("/api/projects/{projectId}/requirements/{requirementId}/versions")
public class RequirementVersionController {

    private static final Logger log = LoggerFactory.getLogger(RequirementVersionController.class);

    private final RequirementVersionService versionService;
    private final RequirementVersionComparisonService comparisonService;
    private final UserRepository userRepository;

    public RequirementVersionController(RequirementVersionService versionService,
                                        RequirementVersionComparisonService comparisonService,
                                        UserRepository userRepository) {
        this.versionService = versionService;
        this.comparisonService = comparisonService;
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
    public ResponseEntity<ApiResponse<RequirementVersionResponse>> createDraftVersion(
            @PathVariable String projectId,
            @PathVariable String requirementId,
            @Valid @RequestBody CreateRequirementVersionRequest request,
            Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        RequirementVersionResponse created = versionService.createDraftVersion(
                projectId, requirementId, request, user.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(created, "Requirement draft version created successfully"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RequirementVersionResponse>>> getVersionHistory(
            @PathVariable String projectId,
            @PathVariable String requirementId,
            Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        List<RequirementVersionResponse> history = versionService.getVersionHistory(
                projectId, requirementId, user.getId());
        ApiResponse<List<RequirementVersionResponse>> response = ApiResponse.ok(history);
        response.setMeta(new ApiResponse.Meta((long) history.size(), null, null));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/compare")
    public ResponseEntity<ApiResponse<RequirementVersionComparisonResponse>> compareVersions(
            @PathVariable String projectId,
            @PathVariable String requirementId,
            @RequestParam(name = "from", required = false) Integer from,
            @RequestParam(name = "to", required = false) Integer to,
            Authentication auth) {
        if (from == null || from <= 0 || to == null || to <= 0) {
            throw new IllegalArgumentException("Version comparison parameters 'from' and 'to' must be positive integers.");
        }
        User user = resolveAuthenticatedUser(auth);
        RequirementVersionComparisonResponse comparison = comparisonService.compareVersions(
                projectId, requirementId, from, to, user.getId());
        return ResponseEntity.ok(ApiResponse.ok(comparison));
    }

    @GetMapping("/{versionNumber}")
    public ResponseEntity<ApiResponse<RequirementVersionResponse>> getVersion(
            @PathVariable String projectId,
            @PathVariable String requirementId,
            @PathVariable Integer versionNumber,
            Authentication auth) {
        if (versionNumber == null || versionNumber <= 0) {
            throw new IllegalArgumentException("Version number must be a positive integer.");
        }
        User user = resolveAuthenticatedUser(auth);
        RequirementVersionResponse version = versionService.getVersion(
                projectId, requirementId, versionNumber, user.getId());
        return ResponseEntity.ok(ApiResponse.ok(version));
    }

    @PostMapping("/{versionNumber}/submit")
    public ResponseEntity<ApiResponse<RequirementVersionResponse>> submitForReview(
            @PathVariable String projectId,
            @PathVariable String requirementId,
            @PathVariable Integer versionNumber,
            Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        RequirementVersionResponse response = versionService.submitForReview(
                projectId, requirementId, versionNumber, user.getId());
        return ResponseEntity.ok(ApiResponse.ok(response, "Requirement version submitted for review successfully"));
    }

    @PostMapping("/{versionNumber}/approve")
    public ResponseEntity<ApiResponse<RequirementVersionResponse>> approveVersion(
            @PathVariable String projectId,
            @PathVariable String requirementId,
            @PathVariable Integer versionNumber,
            @RequestBody(required = false) ApproveRequirementVersionRequest request,
            Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        String comment = (request != null) ? request.getReviewComment() : null;
        RequirementVersionResponse response = versionService.approveVersion(
                projectId, requirementId, versionNumber, comment, user.getId());
        return ResponseEntity.ok(ApiResponse.ok(response, "Requirement version approved successfully"));
    }

    @PostMapping("/{versionNumber}/reject")
    public ResponseEntity<ApiResponse<RequirementVersionResponse>> rejectVersion(
            @PathVariable String projectId,
            @PathVariable String requirementId,
            @PathVariable Integer versionNumber,
            @RequestBody(required = false) RejectRequirementVersionRequest request,
            Authentication auth) {
        if (request == null || request.getReviewComment() == null || request.getReviewComment().trim().isEmpty()) {
            throw new IllegalArgumentException("Rejection comment is required.");
        }
        User user = resolveAuthenticatedUser(auth);
        RequirementVersionResponse response = versionService.rejectVersion(
                projectId, requirementId, versionNumber, request.getReviewComment(), user.getId());
        return ResponseEntity.ok(ApiResponse.ok(response, "Requirement version rejected successfully"));
    }
}
