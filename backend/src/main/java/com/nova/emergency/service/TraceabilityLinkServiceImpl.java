package com.nova.emergency.service;

import com.nova.emergency.dto.CreateTraceabilityLinkRequest;
import com.nova.emergency.dto.TraceabilityLinkResponse;
import com.nova.emergency.dto.UpdateTraceabilityLinkRequest;
import com.nova.emergency.exception.ResourceNotFoundException;
import com.nova.emergency.model.*;
import com.nova.emergency.repository.ProjectRepository;
import com.nova.emergency.repository.RequirementRepository;
import com.nova.emergency.repository.TraceabilityLinkRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

/**
 * Production implementation of {@link TraceabilityLinkService}.
 * Enforces project authorization, artifact existence, directional relationship validity,
 * self-link prevention, duplicate detection, in-place reactivation, and circular dependency checks.
 */
@Service
public class TraceabilityLinkServiceImpl implements TraceabilityLinkService {

    private static final Logger log = LoggerFactory.getLogger(TraceabilityLinkServiceImpl.class);

    private final TraceabilityLinkRepository traceabilityLinkRepository;
    private final RequirementRepository requirementRepository;
    private final ProjectRepository projectRepository;

    public TraceabilityLinkServiceImpl(TraceabilityLinkRepository traceabilityLinkRepository,
                                       RequirementRepository requirementRepository,
                                       ProjectRepository projectRepository) {
        this.traceabilityLinkRepository = traceabilityLinkRepository;
        this.requirementRepository = requirementRepository;
        this.projectRepository = projectRepository;
    }

    @Override
    public TraceabilityLinkResponse createLink(String projectId, CreateTraceabilityLinkRequest request, String authenticatedUserId) {
        validateProjectAccess(projectId, authenticatedUserId);
        validateCreatePayload(request);
        validateNoSelfLink(request);
        validateArtifactCombination(request.getLinkType(), request.getSourceArtifactType(), request.getTargetArtifactType());

        // Validate artifact existence and project-scoping for supported domain types
        validateArtifactExistence(projectId, request.getSourceArtifactType(), request.getSourceArtifactId());
        validateArtifactExistence(projectId, request.getTargetArtifactType(), request.getTargetArtifactId());

        String sourceId = request.getSourceArtifactId().trim();
        String targetId = request.getTargetArtifactId().trim();

        // Check for existing logical relationship regardless of status
        Optional<TraceabilityLink> existingOpt = traceabilityLinkRepository
                .findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndTargetArtifactTypeAndTargetArtifactIdAndLinkType(
                        projectId,
                        request.getSourceArtifactType(),
                        sourceId,
                        request.getTargetArtifactType(),
                        targetId,
                        request.getLinkType());

        if (existingOpt.isPresent()) {
            TraceabilityLink existing = existingOpt.get();
            if (existing.getStatus() == TraceabilityLinkStatus.ACTIVE) {
                log.warn("Duplicate active link creation rejected: {} -> {} ({}) in project {}",
                        sourceId, targetId, request.getLinkType(), projectId);
                throw new IllegalStateException("An active traceability link already exists for this logical relationship.");
            }

            // Inactive link exists: Reactivate without creating a new document
            validateNoCircularDependency(projectId, sourceId, targetId, request.getLinkType());

            existing.setStatus(TraceabilityLinkStatus.ACTIVE);
            existing.setUpdatedAt(Instant.now().toString());
            if (request.getDescription() != null) {
                existing.setDescription(request.getDescription().trim());
            }

            TraceabilityLink reactivated = traceabilityLinkRepository.save(existing);
            log.info("Reactivated existing traceability link {} in project {} by user {}",
                    reactivated.getId(), projectId, authenticatedUserId);
            return TraceabilityLinkResponse.from(reactivated);
        }

        // Validate circular dependencies before creating a new relationship
        validateNoCircularDependency(projectId, sourceId, targetId, request.getLinkType());

        String now = Instant.now().toString();
        TraceabilityLink candidate = TraceabilityLink.builder()
                .projectId(projectId)
                .sourceArtifactType(request.getSourceArtifactType())
                .sourceArtifactId(sourceId)
                .targetArtifactType(request.getTargetArtifactType())
                .targetArtifactId(targetId)
                .linkType(request.getLinkType())
                .status(TraceabilityLinkStatus.ACTIVE)
                .description(request.getDescription() != null && !request.getDescription().isBlank()
                        ? request.getDescription().trim() : null)
                .createdBy(authenticatedUserId)
                .createdAt(now)
                .updatedAt(now)
                .build();

        try {
            TraceabilityLink saved = traceabilityLinkRepository.save(candidate);
            log.info("Created new traceability link {} ({} -> {} [{}]) in project {} by user {}",
                    saved.getId(), sourceId, targetId, request.getLinkType(), projectId, authenticatedUserId);
            return TraceabilityLinkResponse.from(saved);
        } catch (DuplicateKeyException e) {
            log.warn("Concurrent duplicate conflict detected for relationship in project {}", projectId);
            throw new IllegalStateException("A traceability link for this logical relationship was concurrently created. Please retry.");
        }
    }

    @Override
    public TraceabilityLinkResponse getLinkById(String projectId, String linkId, String authenticatedUserId) {
        validateProjectAccess(projectId, authenticatedUserId);

        TraceabilityLink link = traceabilityLinkRepository.findByIdAndProjectId(linkId, projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Traceability link not found with ID " + linkId + " in project " + projectId));

        return TraceabilityLinkResponse.from(link);
    }

    @Override
    public Page<TraceabilityLinkResponse> getLinksByProject(String projectId, TraceabilityLinkStatus status, Pageable pageable, String authenticatedUserId) {
        validateProjectAccess(projectId, authenticatedUserId);

        Page<TraceabilityLink> page = (status != null)
                ? traceabilityLinkRepository.findByProjectIdAndStatus(projectId, status, pageable)
                : traceabilityLinkRepository.findByProjectId(projectId, pageable);

        return page.map(TraceabilityLinkResponse::from);
    }

    @Override
    public List<TraceabilityLinkResponse> getLinksByProject(String projectId, TraceabilityLinkStatus status, String authenticatedUserId) {
        validateProjectAccess(projectId, authenticatedUserId);

        List<TraceabilityLink> links = (status != null)
                ? traceabilityLinkRepository.findByProjectIdAndStatusOrderByCreatedAtDesc(projectId, status)
                : traceabilityLinkRepository.findByProjectIdOrderByCreatedAtDesc(projectId);

        return links.stream().map(TraceabilityLinkResponse::from).toList();
    }

    @Override
    public Page<TraceabilityLinkResponse> getOutgoingLinks(String projectId, TraceabilityArtifactType sourceArtifactType, String sourceArtifactId, TraceabilityLinkStatus status, Pageable pageable, String authenticatedUserId) {
        validateProjectAccess(projectId, authenticatedUserId);

        Page<TraceabilityLink> page = (status != null)
                ? traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndStatus(projectId, sourceArtifactType, sourceArtifactId, status, pageable)
                : traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactId(projectId, sourceArtifactType, sourceArtifactId, pageable);

        return page.map(TraceabilityLinkResponse::from);
    }

    @Override
    public List<TraceabilityLinkResponse> getOutgoingLinks(String projectId, TraceabilityArtifactType sourceArtifactType, String sourceArtifactId, TraceabilityLinkStatus status, String authenticatedUserId) {
        validateProjectAccess(projectId, authenticatedUserId);

        List<TraceabilityLink> links = (status != null)
                ? traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndStatusOrderByCreatedAtDesc(projectId, sourceArtifactType, sourceArtifactId, status)
                : traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdOrderByCreatedAtDesc(projectId, sourceArtifactType, sourceArtifactId);

        return links.stream().map(TraceabilityLinkResponse::from).toList();
    }

    @Override
    public Page<TraceabilityLinkResponse> getIncomingLinks(String projectId, TraceabilityArtifactType targetArtifactType, String targetArtifactId, TraceabilityLinkStatus status, Pageable pageable, String authenticatedUserId) {
        validateProjectAccess(projectId, authenticatedUserId);

        Page<TraceabilityLink> page = (status != null)
                ? traceabilityLinkRepository.findByProjectIdAndTargetArtifactTypeAndTargetArtifactIdAndStatus(projectId, targetArtifactType, targetArtifactId, status, pageable)
                : traceabilityLinkRepository.findByProjectIdAndTargetArtifactTypeAndTargetArtifactId(projectId, targetArtifactType, targetArtifactId, pageable);

        return page.map(TraceabilityLinkResponse::from);
    }

    @Override
    public List<TraceabilityLinkResponse> getIncomingLinks(String projectId, TraceabilityArtifactType targetArtifactType, String targetArtifactId, TraceabilityLinkStatus status, String authenticatedUserId) {
        validateProjectAccess(projectId, authenticatedUserId);

        List<TraceabilityLink> links = (status != null)
                ? traceabilityLinkRepository.findByProjectIdAndTargetArtifactTypeAndTargetArtifactIdAndStatusOrderByCreatedAtDesc(projectId, targetArtifactType, targetArtifactId, status)
                : traceabilityLinkRepository.findByProjectIdAndTargetArtifactTypeAndTargetArtifactIdOrderByCreatedAtDesc(projectId, targetArtifactType, targetArtifactId);

        return links.stream().map(TraceabilityLinkResponse::from).toList();
    }

    @Override
    public Page<TraceabilityLinkResponse> getLinksByType(String projectId, TraceabilityLinkType linkType, TraceabilityLinkStatus status, Pageable pageable, String authenticatedUserId) {
        validateProjectAccess(projectId, authenticatedUserId);

        Page<TraceabilityLink> page = (status != null)
                ? traceabilityLinkRepository.findByProjectIdAndLinkTypeAndStatus(projectId, linkType, status, pageable)
                : traceabilityLinkRepository.findByProjectIdAndLinkType(projectId, linkType, pageable);

        return page.map(TraceabilityLinkResponse::from);
    }

    @Override
    public List<TraceabilityLinkResponse> getLinksByType(String projectId, TraceabilityLinkType linkType, TraceabilityLinkStatus status, String authenticatedUserId) {
        validateProjectAccess(projectId, authenticatedUserId);

        List<TraceabilityLink> links = (status != null)
                ? traceabilityLinkRepository.findByProjectIdAndLinkTypeAndStatusOrderByCreatedAtDesc(projectId, linkType, status)
                : traceabilityLinkRepository.findByProjectIdAndLinkTypeOrderByCreatedAtDesc(projectId, linkType);

        return links.stream().map(TraceabilityLinkResponse::from).toList();
    }

    @Override
    public TraceabilityLinkResponse updateLink(String projectId, String linkId, UpdateTraceabilityLinkRequest request, String authenticatedUserId) {
        validateProjectAccess(projectId, authenticatedUserId);

        TraceabilityLink link = traceabilityLinkRepository.findByIdAndProjectId(linkId, projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Traceability link not found with ID " + linkId + " in project " + projectId));

        if (request != null && request.getDescription() != null) {
            String trimmed = request.getDescription().trim();
            link.setDescription(trimmed.isEmpty() ? null : trimmed);
        }

        link.setUpdatedAt(Instant.now().toString());
        TraceabilityLink saved = traceabilityLinkRepository.save(link);
        log.info("Traceability link {} description updated in project {} by user {}", linkId, projectId, authenticatedUserId);

        return TraceabilityLinkResponse.from(saved);
    }

    @Override
    public TraceabilityLinkResponse deactivateLink(String projectId, String linkId, String authenticatedUserId) {
        validateProjectAccess(projectId, authenticatedUserId);

        TraceabilityLink link = traceabilityLinkRepository.findByIdAndProjectId(linkId, projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Traceability link not found with ID " + linkId + " in project " + projectId));

        if (link.getStatus() == TraceabilityLinkStatus.INACTIVE) {
            return TraceabilityLinkResponse.from(link);
        }

        link.setStatus(TraceabilityLinkStatus.INACTIVE);
        link.setUpdatedAt(Instant.now().toString());

        TraceabilityLink saved = traceabilityLinkRepository.save(link);
        log.info("Traceability link {} deactivated in project {} by user {}", linkId, projectId, authenticatedUserId);

        return TraceabilityLinkResponse.from(saved);
    }

    @Override
    public TraceabilityLinkResponse reactivateLink(String projectId, String linkId, String authenticatedUserId) {
        validateProjectAccess(projectId, authenticatedUserId);

        TraceabilityLink link = traceabilityLinkRepository.findByIdAndProjectId(linkId, projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Traceability link not found with ID " + linkId + " in project " + projectId));

        if (link.getStatus() == TraceabilityLinkStatus.ACTIVE) {
            return TraceabilityLinkResponse.from(link);
        }

        validateNoCircularDependency(projectId, link.getSourceArtifactId(), link.getTargetArtifactId(), link.getLinkType());

        link.setStatus(TraceabilityLinkStatus.ACTIVE);
        link.setUpdatedAt(Instant.now().toString());

        TraceabilityLink saved = traceabilityLinkRepository.save(link);
        log.info("Traceability link {} reactivated in project {} by user {}", linkId, projectId, authenticatedUserId);

        return TraceabilityLinkResponse.from(saved);
    }

    @Override
    public void deleteLink(String projectId, String linkId, String authenticatedUserId) {
        validateProjectAccess(projectId, authenticatedUserId);

        TraceabilityLink link = traceabilityLinkRepository.findByIdAndProjectId(linkId, projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Traceability link not found with ID " + linkId + " in project " + projectId));

        traceabilityLinkRepository.deleteByIdAndProjectId(linkId, projectId);
        log.info("Traceability link {} permanently deleted from project {} by user {}", linkId, projectId, authenticatedUserId);
    }

    // =========================================================================
    // Validation Helpers
    // =========================================================================

    private void validateProjectAccess(String projectId, String authenticatedUserId) {
        if (projectId == null || projectId.isBlank()) {
            throw new ResourceNotFoundException("Project not found with empty id.");
        }
        if (authenticatedUserId == null || authenticatedUserId.isBlank()) {
            throw new AccessDeniedException("Access denied. Insufficient privileges.");
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        if (!authenticatedUserId.equals(project.getOwnerId())) {
            log.warn("Unauthorized access attempt to project {} by user {}", projectId, authenticatedUserId);
            throw new AccessDeniedException("Access denied. Insufficient privileges.");
        }
    }

    private void validateCreatePayload(CreateTraceabilityLinkRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Traceability link request must not be null.");
        }
        if (request.getSourceArtifactType() == null) {
            throw new IllegalArgumentException("Source artifact type is required.");
        }
        if (request.getSourceArtifactId() == null || request.getSourceArtifactId().isBlank()) {
            throw new IllegalArgumentException("Source artifact ID is required.");
        }
        if (request.getTargetArtifactType() == null) {
            throw new IllegalArgumentException("Target artifact type is required.");
        }
        if (request.getTargetArtifactId() == null || request.getTargetArtifactId().isBlank()) {
            throw new IllegalArgumentException("Target artifact ID is required.");
        }
        if (request.getLinkType() == null) {
            throw new IllegalArgumentException("Link type is required.");
        }
    }

    private void validateNoSelfLink(CreateTraceabilityLinkRequest request) {
        if (request.getSourceArtifactType() == request.getTargetArtifactType()
                && request.getSourceArtifactId().trim().equalsIgnoreCase(request.getTargetArtifactId().trim())) {
            throw new IllegalArgumentException("Cannot create a self-referencing traceability link: source and target artifacts must be different.");
        }
    }

    private void validateArtifactCombination(TraceabilityLinkType linkType,
                                             TraceabilityArtifactType source,
                                             TraceabilityArtifactType target) {
        switch (linkType) {
            case DEPENDS_ON:
            case BLOCKS:
                if (source != TraceabilityArtifactType.REQUIREMENT || target != TraceabilityArtifactType.REQUIREMENT) {
                    throw new IllegalArgumentException("Relationship type " + linkType + " only supports REQUIREMENT to REQUIREMENT links.");
                }
                break;
            case VERIFIED_BY:
                if (source != TraceabilityArtifactType.REQUIREMENT || target != TraceabilityArtifactType.TEST_CASE) {
                    throw new IllegalArgumentException("Relationship type VERIFIED_BY requires source REQUIREMENT and target TEST_CASE.");
                }
                break;
            case IMPLEMENTED_BY:
                if (source != TraceabilityArtifactType.REQUIREMENT
                        || (target != TraceabilityArtifactType.CODE_REFERENCE
                        && target != TraceabilityArtifactType.GITHUB_COMMIT
                        && target != TraceabilityArtifactType.GITHUB_PULL_REQUEST)) {
                    throw new IllegalArgumentException("Relationship type IMPLEMENTED_BY requires source REQUIREMENT and target CODE_REFERENCE, GITHUB_COMMIT, or GITHUB_PULL_REQUEST.");
                }
                break;
            case RELATED_TO:
                // Permitted between any recognized artifact types
                break;
            default:
                throw new IllegalArgumentException("Unsupported relationship type: " + linkType);
        }
    }

    private void validateArtifactExistence(String projectId, TraceabilityArtifactType type, String artifactId) {
        String trimmedId = artifactId.trim();
        if (type == TraceabilityArtifactType.REQUIREMENT) {
            requirementRepository.findByIdAndProjectId(trimmedId, projectId)
                    .orElseThrow(() -> new ResourceNotFoundException("Requirement not found with id " + trimmedId + " in project " + projectId));
        }
        // Future external artifact types (TEST_CASE, CODE_REFERENCE, GITHUB_COMMIT, GITHUB_PULL_REQUEST)
        // do not maintain a local Mongo collection in this module, preserving enum compatibility.
    }

    /**
     * Cycle detection for directional dependency graphs (e.g. DEPENDS_ON and BLOCKS).
     * Verifies that adding or reactivating an edge (source -> target) does not create a directed cycle.
     */
    private void validateNoCircularDependency(String projectId, String sourceArtifactId, String targetArtifactId, TraceabilityLinkType linkType) {
        if (linkType != TraceabilityLinkType.DEPENDS_ON && linkType != TraceabilityLinkType.BLOCKS) {
            return;
        }

        // BFS to determine if targetArtifactId already reaches sourceArtifactId via existing ACTIVE links
        Queue<String> queue = new LinkedList<>();
        Set<String> visited = new HashSet<>();

        queue.add(targetArtifactId);
        visited.add(targetArtifactId);

        while (!queue.isEmpty()) {
            String current = queue.poll();

            if (current.equalsIgnoreCase(sourceArtifactId)) {
                throw new IllegalStateException("Circular dependency detected: Adding a " + linkType
                        + " link from '" + sourceArtifactId + "' to '" + targetArtifactId + "' would create a cycle.");
            }

            List<TraceabilityLink> outgoing = traceabilityLinkRepository
                    .findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndStatus(
                            projectId, TraceabilityArtifactType.REQUIREMENT, current, TraceabilityLinkStatus.ACTIVE);

            for (TraceabilityLink outLink : outgoing) {
                if (outLink.getLinkType() == linkType) {
                    String next = outLink.getTargetArtifactId();
                    if (next.equalsIgnoreCase(sourceArtifactId)) {
                        throw new IllegalStateException("Circular dependency detected: Adding a " + linkType
                                + " link from '" + sourceArtifactId + "' to '" + targetArtifactId + "' would create a cycle.");
                    }
                    if (!visited.contains(next)) {
                        visited.add(next);
                        queue.add(next);
                    }
                }
            }
        }
    }
}
