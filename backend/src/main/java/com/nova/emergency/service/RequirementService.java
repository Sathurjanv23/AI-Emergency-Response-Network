package com.nova.emergency.service;

import com.nova.emergency.dto.CreateRequirementRequest;
import com.nova.emergency.dto.CreateRequirementVersionRequest;
import com.nova.emergency.dto.RequirementResponse;
import com.nova.emergency.dto.UpdateRequirementRequest;
import com.nova.emergency.exception.InvalidStatusTransitionException;
import com.nova.emergency.exception.ResourceNotFoundException;
import com.nova.emergency.model.*;
import com.nova.emergency.repository.ProjectRepository;
import com.nova.emergency.repository.RequirementRepository;
import com.nova.emergency.repository.RequirementVersionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RequirementService {

    private static final Logger log = LoggerFactory.getLogger(RequirementService.class);
    private static final int MAX_KEY_ALLOCATION_RETRIES = 5;

    private static final Map<String, List<String>> ALLOWED_STATUS_TRANSITIONS = Map.of(
            Requirement.STATUS_DRAFT, List.of(Requirement.STATUS_IN_REVIEW, Requirement.STATUS_DEPRECATED),
            Requirement.STATUS_IN_REVIEW, List.of(Requirement.STATUS_APPROVED, Requirement.STATUS_REJECTED, Requirement.STATUS_DRAFT),
            Requirement.STATUS_APPROVED, List.of(Requirement.STATUS_IN_REVIEW, Requirement.STATUS_DEPRECATED),
            Requirement.STATUS_REJECTED, List.of(Requirement.STATUS_DRAFT),
            Requirement.STATUS_DEPRECATED, List.of(Requirement.STATUS_DRAFT)
    );

    private final RequirementRepository requirementRepository;
    private final RequirementVersionRepository versionRepository;
    private final ProjectRepository projectRepository;
    private final RequirementVersionService versionService;

    public RequirementService(RequirementRepository requirementRepository,
                              RequirementVersionRepository versionRepository,
                              ProjectRepository projectRepository,
                              RequirementVersionService versionService) {
        this.requirementRepository = requirementRepository;
        this.versionRepository = versionRepository;
        this.projectRepository = projectRepository;
        this.versionService = versionService;
    }

    public RequirementResponse createRequirement(String projectId,
                                                 CreateRequirementRequest request,
                                                 String authenticatedUserId) {
        validateProjectAccess(projectId, authenticatedUserId);
        validateCreatePayload(request);

        String now = Instant.now().toString();
        Requirement requirement = null;
        int attempts = 0;

        while (attempts < MAX_KEY_ALLOCATION_RETRIES) {
            attempts++;
            String requirementKey = generateNextRequirementKey(projectId);

            Requirement candidate = Requirement.builder()
                    .projectId(projectId)
                    .requirementKey(requirementKey)
                    .title(request.getTitle().trim())
                    .description(request.getDescription().trim())
                    .type(request.getType() != null ? request.getType().toUpperCase() : Requirement.TYPE_FUNCTIONAL)
                    .priority(request.getPriority() != null ? request.getPriority().toUpperCase() : Requirement.PRIORITY_MEDIUM)
                    .status(Requirement.STATUS_DRAFT)
                    .sourceDocumentId(request.getSourceDocumentId() != null && !request.getSourceDocumentId().isBlank()
                            ? request.getSourceDocumentId().trim() : null)
                    .createdBy(authenticatedUserId)
                    .createdAt(now)
                    .updatedAt(now)
                    .build();

            try {
                requirement = requirementRepository.save(candidate);
                log.info("Requirement {} ({}) created in project {} by user {}",
                        requirement.getId(), requirement.getRequirementKey(), projectId, authenticatedUserId);
                break;
            } catch (DuplicateKeyException e) {
                log.warn("Requirement key conflict on attempt {}/{} for project {}. Retrying...",
                        attempts, MAX_KEY_ALLOCATION_RETRIES, projectId);
                if (attempts >= MAX_KEY_ALLOCATION_RETRIES) {
                    throw new IllegalStateException("Failed to allocate unique requirement key in project " + projectId + ". Please retry.");
                }
            }
        }

        if (requirement == null) {
            throw new IllegalStateException("Requirement creation failed after " + MAX_KEY_ALLOCATION_RETRIES + " attempts.");
        }

        // Initialize baseline version 1 snapshot
        RequirementVersion baseline = RequirementVersion.builder()
                .projectId(projectId)
                .requirementId(requirement.getId())
                .versionNumber(1)
                .title(requirement.getTitle())
                .description(requirement.getDescription())
                .changeSummary("Initial requirement baseline")
                .changeType(ChangeType.CREATED)
                .reviewStatus(ReviewStatus.DRAFT)
                .createdBy(authenticatedUserId)
                .createdAt(now)
                .build();

        try {
            RequirementVersion savedVersion = versionRepository.save(baseline);
            requirement.setCurrentVersionId(savedVersion.getId());
            requirement = requirementRepository.save(requirement);
            log.info("Baseline version 1 initialized for requirement {}", requirement.getId());
        } catch (DuplicateKeyException e) {
            log.info("Concurrent baseline creation caught for requirement {}. Fetching existing version 1.", requirement.getId());
            Optional<RequirementVersion> existing = versionRepository.findByRequirementIdAndVersionNumber(requirement.getId(), 1);
            if (existing.isPresent()) {
                requirement.setCurrentVersionId(existing.get().getId());
                requirement = requirementRepository.save(requirement);
            }
        }

        return RequirementResponse.from(requirement);
    }

    public List<RequirementResponse> getRequirements(String projectId,
                                                     String status,
                                                     String priority,
                                                     String type,
                                                     String search,
                                                     Integer page,
                                                     Integer pageSize,
                                                     String authenticatedUserId) {
        validateProjectAccess(projectId, authenticatedUserId);

        List<Requirement> requirements = requirementRepository.findByProjectIdOrderByCreatedAtDesc(projectId);

        List<Requirement> filtered = requirements.stream()
                .filter(req -> {
                    if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
                        if (!status.equalsIgnoreCase(req.getStatus())) return false;
                    }
                    if (priority != null && !priority.isBlank() && !"ALL".equalsIgnoreCase(priority)) {
                        if (!priority.equalsIgnoreCase(req.getPriority())) return false;
                    }
                    if (type != null && !type.isBlank() && !"ALL".equalsIgnoreCase(type)) {
                        if (!type.equalsIgnoreCase(req.getType())) return false;
                    }
                    if (search != null && !search.isBlank()) {
                        String q = search.toLowerCase().trim();
                        boolean matchKey = req.getRequirementKey() != null && req.getRequirementKey().toLowerCase().contains(q);
                        boolean matchTitle = req.getTitle() != null && req.getTitle().toLowerCase().contains(q);
                        boolean matchDesc = req.getDescription() != null && req.getDescription().toLowerCase().contains(q);
                        if (!matchKey && !matchTitle && !matchDesc) return false;
                    }
                    return true;
                })
                .collect(Collectors.toList());

        if (page != null && page > 0 && pageSize != null && pageSize > 0) {
            int fromIndex = (page - 1) * pageSize;
            if (fromIndex >= filtered.size()) {
                return Collections.emptyList();
            }
            int toIndex = Math.min(fromIndex + pageSize, filtered.size());
            filtered = filtered.subList(fromIndex, toIndex);
        }

        return filtered.stream()
                .map(RequirementResponse::from)
                .collect(Collectors.toList());
    }

    public long countRequirements(String projectId,
                                  String status,
                                  String priority,
                                  String type,
                                  String search,
                                  String authenticatedUserId) {
        validateProjectAccess(projectId, authenticatedUserId);
        List<Requirement> requirements = requirementRepository.findByProjectId(projectId);

        return requirements.stream()
                .filter(req -> {
                    if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
                        if (!status.equalsIgnoreCase(req.getStatus())) return false;
                    }
                    if (priority != null && !priority.isBlank() && !"ALL".equalsIgnoreCase(priority)) {
                        if (!priority.equalsIgnoreCase(req.getPriority())) return false;
                    }
                    if (type != null && !type.isBlank() && !"ALL".equalsIgnoreCase(type)) {
                        if (!type.equalsIgnoreCase(req.getType())) return false;
                    }
                    if (search != null && !search.isBlank()) {
                        String q = search.toLowerCase().trim();
                        boolean matchKey = req.getRequirementKey() != null && req.getRequirementKey().toLowerCase().contains(q);
                        boolean matchTitle = req.getTitle() != null && req.getTitle().toLowerCase().contains(q);
                        boolean matchDesc = req.getDescription() != null && req.getDescription().toLowerCase().contains(q);
                        if (!matchKey && !matchTitle && !matchDesc) return false;
                    }
                    return true;
                })
                .count();
    }

    public RequirementResponse getRequirement(String projectId,
                                              String requirementId,
                                              String authenticatedUserId) {
        validateProjectAccess(projectId, authenticatedUserId);

        Requirement requirement = requirementRepository.findByIdAndProjectId(requirementId, projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Requirement not found in project: " + projectId));

        return RequirementResponse.from(requirement);
    }

    public RequirementResponse updateRequirement(String projectId,
                                                 String requirementId,
                                                 UpdateRequirementRequest request,
                                                 String authenticatedUserId) {
        validateProjectAccess(projectId, authenticatedUserId);

        if (request == null) {
            throw new IllegalArgumentException("Update payload must not be null.");
        }
        if (request.getTitle() == null || request.getTitle().trim().isEmpty()) {
            throw new IllegalArgumentException("Title is required.");
        }
        if (request.getDescription() == null || request.getDescription().trim().isEmpty()) {
            throw new IllegalArgumentException("Description is required.");
        }

        Requirement requirement = requirementRepository.findByIdAndProjectId(requirementId, projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Requirement not found in project: " + projectId));

        String newTitle = request.getTitle().trim();
        String newDescription = request.getDescription().trim();
        String newType = request.getType() != null ? request.getType().toUpperCase() : requirement.getType();
        String newPriority = request.getPriority() != null ? request.getPriority().toUpperCase() : requirement.getPriority();
        String now = Instant.now().toString();

        boolean contentChanged = !newTitle.equals(requirement.getTitle()) || !newDescription.equals(requirement.getDescription());

        if (Requirement.STATUS_APPROVED.equalsIgnoreCase(requirement.getStatus())) {
            // CRITICAL VERSIONING RULE: Do not overwrite approved content directly!
            if (contentChanged) {
                log.info("Content modification detected on APPROVED requirement {}. Routing to draft version creation.", requirementId);
                CreateRequirementVersionRequest versionReq = CreateRequirementVersionRequest.builder()
                        .title(newTitle)
                        .description(newDescription)
                        .changeSummary("Specification update from editor")
                        .changeType(ChangeType.UPDATED)
                        .build();
                versionService.createDraftVersion(projectId, requirementId, versionReq, authenticatedUserId);
            }
            // Update non-content metadata on the active requirement
            requirement.setType(newType);
            requirement.setPriority(newPriority);
            requirement.setUpdatedAt(now);
            Requirement saved = requirementRepository.save(requirement);
            return RequirementResponse.from(saved);
        }

        if (Requirement.STATUS_IN_REVIEW.equalsIgnoreCase(requirement.getStatus())) {
            if (contentChanged) {
                throw new InvalidStatusTransitionException("Requirement is currently IN_REVIEW. Cannot modify specification while review is pending.");
            }
            requirement.setType(newType);
            requirement.setPriority(newPriority);
            requirement.setUpdatedAt(now);
            Requirement saved = requirementRepository.save(requirement);
            return RequirementResponse.from(saved);
        }

        // For DRAFT (or REJECTED/DEPRECATED) status: direct update is permitted
        requirement.setTitle(newTitle);
        requirement.setDescription(newDescription);
        requirement.setType(newType);
        requirement.setPriority(newPriority);
        requirement.setUpdatedAt(now);

        // Synchronize initial baseline version if still in draft
        Optional<RequirementVersion> baseline = versionRepository.findByProjectIdAndRequirementIdAndVersionNumber(projectId, requirementId, 1);
        if (baseline.isPresent() && baseline.get().getReviewStatus() == ReviewStatus.DRAFT) {
            RequirementVersion v = baseline.get();
            v.setTitle(newTitle);
            v.setDescription(newDescription);
            versionRepository.save(v);
        }

        Requirement saved = requirementRepository.save(requirement);
        return RequirementResponse.from(saved);
    }

    public RequirementResponse updateStatus(String projectId,
                                            String requirementId,
                                            String newStatus,
                                            String authenticatedUserId) {
        validateProjectAccess(projectId, authenticatedUserId);

        if (newStatus == null || newStatus.isBlank()) {
            throw new IllegalArgumentException("Status is required.");
        }

        Requirement requirement = requirementRepository.findByIdAndProjectId(requirementId, projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Requirement not found in project: " + projectId));

        String currentStatus = requirement.getStatus();
        String targetStatus = newStatus.trim().toUpperCase();

        if (currentStatus.equalsIgnoreCase(targetStatus)) {
            return RequirementResponse.from(requirement);
        }

        List<String> allowed = ALLOWED_STATUS_TRANSITIONS.getOrDefault(currentStatus, Collections.emptyList());
        if (!allowed.contains(targetStatus)) {
            throw new InvalidStatusTransitionException(
                    "Invalid requirement status transition from " + currentStatus + " to " + targetStatus + ".");
        }

        requirement.setStatus(targetStatus);
        requirement.setUpdatedAt(Instant.now().toString());
        Requirement saved = requirementRepository.save(requirement);

        log.info("Requirement {} status transitioned from {} to {} by user {}",
                requirementId, currentStatus, targetStatus, authenticatedUserId);

        return RequirementResponse.from(saved);
    }

    public RequirementResponse deleteRequirement(String projectId,
                                                 String requirementId,
                                                 String authenticatedUserId) {
        validateProjectAccess(projectId, authenticatedUserId);

        Requirement requirement = requirementRepository.findByIdAndProjectId(requirementId, projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Requirement not found in project: " + projectId));

        // Soft-delete: mark as DEPRECATED to preserve historical versions, audit trails and traceability
        requirement.setStatus(Requirement.STATUS_DEPRECATED);
        requirement.setUpdatedAt(Instant.now().toString());
        Requirement saved = requirementRepository.save(requirement);

        log.info("Requirement {} soft-deleted (status=DEPRECATED) in project {} by user {}",
                requirementId, projectId, authenticatedUserId);

        return RequirementResponse.from(saved);
    }

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

    private void validateCreatePayload(CreateRequirementRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Requirement creation request must not be null.");
        }
        if (request.getTitle() == null || request.getTitle().trim().isEmpty()) {
            throw new IllegalArgumentException("Title is required.");
        }
        if (request.getDescription() == null || request.getDescription().trim().isEmpty()) {
            throw new IllegalArgumentException("Description is required.");
        }
    }

    private String generateNextRequirementKey(String projectId) {
        long count = requirementRepository.countByProjectId(projectId);
        long nextIndex = count + 1;
        String candidateKey = String.format("REQ-%03d", nextIndex);

        while (requirementRepository.existsByProjectIdAndRequirementKey(projectId, candidateKey)) {
            nextIndex++;
            candidateKey = String.format("REQ-%03d", nextIndex);
        }

        return candidateKey;
    }
}
