package com.nova.emergency.controller;

import com.nova.emergency.dto.*;
import com.nova.emergency.model.TraceabilityArtifactType;
import com.nova.emergency.model.TraceabilityLinkStatus;
import com.nova.emergency.model.TraceabilityLinkType;
import com.nova.emergency.model.User;
import com.nova.emergency.repository.UserRepository;
import com.nova.emergency.service.TraceabilityLinkService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for managing project-scoped traceability links between software engineering artifacts.
 * Enforces JWT authentication, project tenant isolation, input validation, and maps service exceptions
 * to standard API responses.
 */
@RestController
@RequestMapping("/api/projects/{projectId}/traceability-links")
public class TraceabilityLinkController {

    private static final Logger log = LoggerFactory.getLogger(TraceabilityLinkController.class);

    private final TraceabilityLinkService traceabilityLinkService;
    private final UserRepository userRepository;

    public TraceabilityLinkController(TraceabilityLinkService traceabilityLinkService, UserRepository userRepository) {
        this.traceabilityLinkService = traceabilityLinkService;
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
    public ResponseEntity<ApiResponse<TraceabilityLinkResponse>> createLink(
            @PathVariable String projectId,
            @Valid @RequestBody CreateTraceabilityLinkRequest request,
            Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        TraceabilityLinkResponse created = traceabilityLinkService.createLink(projectId, request, user.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(created, "Traceability link created successfully"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TraceabilityLinkResponse>>> listLinks(
            @PathVariable String projectId,
            @RequestParam(required = false) TraceabilityLinkStatus status,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize,
            Authentication auth) {
        User user = resolveAuthenticatedUser(auth);

        if (page != null || pageSize != null) {
            int pageNum = (page != null && page >= 0) ? page : 0;
            int size = (pageSize != null && pageSize > 0) ? pageSize : 20;
            Pageable pageable = PageRequest.of(pageNum, size, Sort.by(Sort.Direction.DESC, "createdAt"));
            Page<TraceabilityLinkResponse> pageResult = traceabilityLinkService.getLinksByProject(projectId, status, pageable, user.getId());

            ApiResponse<List<TraceabilityLinkResponse>> response = ApiResponse.ok(pageResult.getContent());
            response.setMeta(new ApiResponse.Meta(pageResult.getTotalElements(), pageNum, size));
            return ResponseEntity.ok(response);
        }

        List<TraceabilityLinkResponse> links = traceabilityLinkService.getLinksByProject(projectId, status, user.getId());
        ApiResponse<List<TraceabilityLinkResponse>> response = ApiResponse.ok(links);
        response.setMeta(new ApiResponse.Meta((long) links.size(), null, null));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/outgoing")
    public ResponseEntity<ApiResponse<List<TraceabilityLinkResponse>>> getOutgoingLinks(
            @PathVariable String projectId,
            @RequestParam(required = false) TraceabilityArtifactType sourceArtifactType,
            @RequestParam(required = false) String sourceArtifactId,
            @RequestParam(required = false) TraceabilityLinkStatus status,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize,
            Authentication auth) {
        if (sourceArtifactType == null) {
            throw new IllegalArgumentException("Source artifact type is required.");
        }
        if (sourceArtifactId == null || sourceArtifactId.isBlank()) {
            throw new IllegalArgumentException("Source artifact ID is required.");
        }

        User user = resolveAuthenticatedUser(auth);

        if (page != null || pageSize != null) {
            int pageNum = (page != null && page >= 0) ? page : 0;
            int size = (pageSize != null && pageSize > 0) ? pageSize : 20;
            Pageable pageable = PageRequest.of(pageNum, size, Sort.by(Sort.Direction.DESC, "createdAt"));
            Page<TraceabilityLinkResponse> pageResult = traceabilityLinkService.getOutgoingLinks(
                    projectId, sourceArtifactType, sourceArtifactId.trim(), status, pageable, user.getId());

            ApiResponse<List<TraceabilityLinkResponse>> response = ApiResponse.ok(pageResult.getContent());
            response.setMeta(new ApiResponse.Meta(pageResult.getTotalElements(), pageNum, size));
            return ResponseEntity.ok(response);
        }

        List<TraceabilityLinkResponse> links = traceabilityLinkService.getOutgoingLinks(
                projectId, sourceArtifactType, sourceArtifactId.trim(), status, user.getId());
        ApiResponse<List<TraceabilityLinkResponse>> response = ApiResponse.ok(links);
        response.setMeta(new ApiResponse.Meta((long) links.size(), null, null));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/incoming")
    public ResponseEntity<ApiResponse<List<TraceabilityLinkResponse>>> getIncomingLinks(
            @PathVariable String projectId,
            @RequestParam(required = false) TraceabilityArtifactType targetArtifactType,
            @RequestParam(required = false) String targetArtifactId,
            @RequestParam(required = false) TraceabilityLinkStatus status,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize,
            Authentication auth) {
        if (targetArtifactType == null) {
            throw new IllegalArgumentException("Target artifact type is required.");
        }
        if (targetArtifactId == null || targetArtifactId.isBlank()) {
            throw new IllegalArgumentException("Target artifact ID is required.");
        }

        User user = resolveAuthenticatedUser(auth);

        if (page != null || pageSize != null) {
            int pageNum = (page != null && page >= 0) ? page : 0;
            int size = (pageSize != null && pageSize > 0) ? pageSize : 20;
            Pageable pageable = PageRequest.of(pageNum, size, Sort.by(Sort.Direction.DESC, "createdAt"));
            Page<TraceabilityLinkResponse> pageResult = traceabilityLinkService.getIncomingLinks(
                    projectId, targetArtifactType, targetArtifactId.trim(), status, pageable, user.getId());

            ApiResponse<List<TraceabilityLinkResponse>> response = ApiResponse.ok(pageResult.getContent());
            response.setMeta(new ApiResponse.Meta(pageResult.getTotalElements(), pageNum, size));
            return ResponseEntity.ok(response);
        }

        List<TraceabilityLinkResponse> links = traceabilityLinkService.getIncomingLinks(
                projectId, targetArtifactType, targetArtifactId.trim(), status, user.getId());
        ApiResponse<List<TraceabilityLinkResponse>> response = ApiResponse.ok(links);
        response.setMeta(new ApiResponse.Meta((long) links.size(), null, null));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/by-type")
    public ResponseEntity<ApiResponse<List<TraceabilityLinkResponse>>> getLinksByType(
            @PathVariable String projectId,
            @RequestParam(required = false) TraceabilityLinkType linkType,
            @RequestParam(required = false) TraceabilityLinkStatus status,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize,
            Authentication auth) {
        if (linkType == null) {
            throw new IllegalArgumentException("Link type is required.");
        }

        User user = resolveAuthenticatedUser(auth);

        if (page != null || pageSize != null) {
            int pageNum = (page != null && page >= 0) ? page : 0;
            int size = (pageSize != null && pageSize > 0) ? pageSize : 20;
            Pageable pageable = PageRequest.of(pageNum, size, Sort.by(Sort.Direction.DESC, "createdAt"));
            Page<TraceabilityLinkResponse> pageResult = traceabilityLinkService.getLinksByType(
                    projectId, linkType, status, pageable, user.getId());

            ApiResponse<List<TraceabilityLinkResponse>> response = ApiResponse.ok(pageResult.getContent());
            response.setMeta(new ApiResponse.Meta(pageResult.getTotalElements(), pageNum, size));
            return ResponseEntity.ok(response);
        }

        List<TraceabilityLinkResponse> links = traceabilityLinkService.getLinksByType(
                projectId, linkType, status, user.getId());
        ApiResponse<List<TraceabilityLinkResponse>> response = ApiResponse.ok(links);
        response.setMeta(new ApiResponse.Meta((long) links.size(), null, null));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{linkId}")
    public ResponseEntity<ApiResponse<TraceabilityLinkResponse>> getLink(
            @PathVariable String projectId,
            @PathVariable String linkId,
            Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        TraceabilityLinkResponse link = traceabilityLinkService.getLinkById(projectId, linkId, user.getId());
        return ResponseEntity.ok(ApiResponse.ok(link));
    }

    @PatchMapping("/{linkId}")
    public ResponseEntity<ApiResponse<TraceabilityLinkResponse>> updateLink(
            @PathVariable String projectId,
            @PathVariable String linkId,
            @Valid @RequestBody UpdateTraceabilityLinkRequest request,
            Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        TraceabilityLinkResponse updated = traceabilityLinkService.updateLink(projectId, linkId, request, user.getId());
        return ResponseEntity.ok(ApiResponse.ok(updated, "Traceability link updated successfully"));
    }

    @PatchMapping("/{linkId}/deactivate")
    public ResponseEntity<ApiResponse<TraceabilityLinkResponse>> deactivateLink(
            @PathVariable String projectId,
            @PathVariable String linkId,
            Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        TraceabilityLinkResponse deactivated = traceabilityLinkService.deactivateLink(projectId, linkId, user.getId());
        return ResponseEntity.ok(ApiResponse.ok(deactivated, "Traceability link deactivated successfully"));
    }

    @PatchMapping("/{linkId}/reactivate")
    public ResponseEntity<ApiResponse<TraceabilityLinkResponse>> reactivateLink(
            @PathVariable String projectId,
            @PathVariable String linkId,
            Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        TraceabilityLinkResponse reactivated = traceabilityLinkService.reactivateLink(projectId, linkId, user.getId());
        return ResponseEntity.ok(ApiResponse.ok(reactivated, "Traceability link reactivated successfully"));
    }

    @DeleteMapping("/{linkId}")
    public ResponseEntity<ApiResponse<Void>> deleteLink(
            @PathVariable String projectId,
            @PathVariable String linkId,
            Authentication auth) {
        User user = resolveAuthenticatedUser(auth);
        traceabilityLinkService.deleteLink(projectId, linkId, user.getId());
        return ResponseEntity.ok(ApiResponse.ok(null, "Traceability link deleted successfully"));
    }
}
