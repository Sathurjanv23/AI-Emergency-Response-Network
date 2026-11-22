package com.nova.emergency.service;

import com.nova.emergency.dto.CreateRequirementVersionRequest;
import com.nova.emergency.dto.RequirementVersionResponse;
import com.nova.emergency.exception.ResourceNotFoundException;
import com.nova.emergency.model.ChangeType;
import com.nova.emergency.model.Project;
import com.nova.emergency.model.Requirement;
import com.nova.emergency.model.RequirementVersion;
import com.nova.emergency.model.ReviewStatus;
import com.nova.emergency.repository.ProjectRepository;
import com.nova.emergency.repository.RequirementRepository;
import com.nova.emergency.repository.RequirementVersionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class RequirementVersionService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(RequirementVersionService.class);
    private static final int MAX_ALLOCATION_RETRIES = 5;

    private final RequirementVersionRepository versionRepository;
    private final RequirementRepository requirementRepository;
    private final ProjectRepository projectRepository;

    public RequirementVersionService(RequirementVersionRepository versionRepository,
                                     RequirementRepository requirementRepository,
                                     ProjectRepository projectRepository) {
        this.versionRepository = versionRepository;
        this.requirementRepository = requirementRepository;
        this.projectRepository = projectRepository;
    }

    public RequirementVersionResponse createDraftVersion(String projectId,
                                                         String requirementId,
                                                         CreateRequirementVersionRequest request,
                                                         String authenticatedUserId) {
        Requirement requirement = validateAndGetRequirement(projectId, requirementId, authenticatedUserId);
        validateVersionRequest(request);

        // Ensure baseline version exists if this requirement has no version history yet
        ensureBaselineVersionExists(requirement, authenticatedUserId);

        int attempts = 0;
        while (attempts < MAX_ALLOCATION_RETRIES) {
            attempts++;
            Integer nextVersion = getNextVersionNumber(requirementId);

            String now = Instant.now().toString();
            RequirementVersion newVersion = RequirementVersion.builder()
                    .projectId(projectId)
                    .requirementId(requirementId)
                    .versionNumber(nextVersion)
                    .title(request.getTitle().trim())
                    .description(request.getDescription().trim())
                    .changeSummary(request.getChangeSummary().trim())
                    .changeType(request.getChangeType())
                    .createdBy(authenticatedUserId)
                    .reviewStatus(ReviewStatus.DRAFT)
                    .createdAt(now)
                    .build();

            try {
                RequirementVersion saved = versionRepository.save(newVersion);
                log.info("Draft requirement version {} created for requirement {} in project {} by user {}",
                        saved.getVersionNumber(), requirementId, projectId, authenticatedUserId);

                // Note: requirement.getCurrentVersionId() is strictly protected and NOT changed for DRAFT versions
                return RequirementVersionResponse.from(saved);
            } catch (DuplicateKeyException e) {
                log.warn("Concurrent version number conflict for requirement {} at version {}. Retrying attempt {}/{}",
                        requirementId, nextVersion, attempts, MAX_ALLOCATION_RETRIES);
                if (attempts >= MAX_ALLOCATION_RETRIES) {
                    throw new IllegalStateException("Concurrent version creation conflict for requirement " + requirementId + ". Please retry.");
                }
            }
        }

        throw new IllegalStateException("Failed to allocate version number after " + MAX_ALLOCATION_RETRIES + " attempts.");
    }

    public List<RequirementVersionResponse> getVersionHistory(String projectId,
                                                              String requirementId,
                                                              String authenticatedUserId) {
        Requirement requirement = validateAndGetRequirement(projectId, requirementId, authenticatedUserId);

        // Ensure baseline exists for legacy requirements
        ensureBaselineVersionExists(requirement, authenticatedUserId);

        List<RequirementVersion> versions = versionRepository
                .findByProjectIdAndRequirementIdOrderByVersionNumberDesc(projectId, requirementId);

        return versions.stream()
                .map(RequirementVersionResponse::from)
                .collect(Collectors.toList());
    }

    public RequirementVersionResponse getVersion(String projectId,
                                                 String requirementId,
                                                 Integer versionNumber,
                                                 String authenticatedUserId) {
        validateAndGetRequirement(projectId, requirementId, authenticatedUserId);

        if (versionNumber == null || versionNumber <= 0) {
            throw new IllegalArgumentException("Version number must be a positive integer.");
        }

        RequirementVersion version = versionRepository
                .findByProjectIdAndRequirementIdAndVersionNumber(projectId, requirementId, versionNumber)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Requirement version " + versionNumber + " not found for requirement: " + requirementId));

        return RequirementVersionResponse.from(version);
    }

    public Optional<RequirementVersionResponse> getCurrentApprovedVersion(String projectId,
                                                                         String requirementId,
                                                                         String authenticatedUserId) {
        validateAndGetRequirement(projectId, requirementId, authenticatedUserId);

        return versionRepository
                .findFirstByProjectIdAndRequirementIdAndReviewStatusOrderByVersionNumberDesc(
                        projectId, requirementId, ReviewStatus.APPROVED)
                .map(RequirementVersionResponse::from);
    }

    public RequirementVersionResponse initializeBaselineVersion(String projectId,
                                                                String requirementId,
                                                                String authenticatedUserId) {
        Requirement requirement = validateAndGetRequirement(projectId, requirementId, authenticatedUserId);
        RequirementVersion baseline = ensureBaselineVersionExists(requirement, authenticatedUserId);
        return RequirementVersionResponse.from(baseline);
    }

    private RequirementVersion ensureBaselineVersionExists(Requirement requirement, String authenticatedUserId) {
        Optional<RequirementVersion> existingV1 = versionRepository
                .findByRequirementIdAndVersionNumber(requirement.getId(), 1);
        if (existingV1.isPresent()) {
            return existingV1.get();
        }

        if (versionRepository.countByRequirementId(requirement.getId()) > 0) {
            return versionRepository.findFirstByRequirementIdOrderByVersionNumberDesc(requirement.getId())
                    .orElse(null);
        }

        String author = (requirement.getCreatedBy() != null && !requirement.getCreatedBy().isBlank())
                ? requirement.getCreatedBy()
                : authenticatedUserId;

        String createdAt = requirement.getCreatedAt() != null
                ? requirement.getCreatedAt()
                : Instant.now().toString();

        RequirementVersion baseline = RequirementVersion.builder()
                .projectId(requirement.getProjectId())
                .requirementId(requirement.getId())
                .versionNumber(1)
                .title(requirement.getTitle() != null ? requirement.getTitle() : "Baseline Requirement")
                .description(requirement.getDescription() != null ? requirement.getDescription() : "")
                .changeSummary("Initial requirement snapshot")
                .changeType(ChangeType.CREATED)
                .createdBy(author)
                .reviewStatus(ReviewStatus.DRAFT)
                .createdAt(createdAt)
                .build();

        try {
            RequirementVersion saved = versionRepository.save(baseline);
            log.info("Initialized baseline version 1 for requirement {} in project {}", requirement.getId(), requirement.getProjectId());
            return saved;
        } catch (DuplicateKeyException e) {
            log.info("Concurrent baseline creation caught for requirement {}. Returning existing version 1.", requirement.getId());
            return versionRepository.findByRequirementIdAndVersionNumber(requirement.getId(), 1)
                    .orElseThrow(() -> new IllegalStateException("Failed to load baseline version after concurrent conflict."));
        }
    }

    private Integer getNextVersionNumber(String requirementId) {
        return versionRepository.findFirstByRequirementIdOrderByVersionNumberDesc(requirementId)
                .map(v -> v.getVersionNumber() + 1)
                .orElse(1);
    }

    private Requirement validateAndGetRequirement(String projectId, String requirementId, String authenticatedUserId) {
        if (projectId == null || projectId.isBlank()) {
            throw new ResourceNotFoundException("Project not found with empty id.");
        }
        if (requirementId == null || requirementId.isBlank()) {
            throw new ResourceNotFoundException("Requirement not found with empty id.");
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

        Requirement requirement = requirementRepository.findById(requirementId)
                .orElseThrow(() -> new ResourceNotFoundException("Requirement not found with id: " + requirementId));

        if (!projectId.equals(requirement.getProjectId())) {
            log.warn("Cross-project access attempt: requirement {} does not belong to project {}", requirementId, projectId);
            throw new ResourceNotFoundException("Requirement not found in project: " + projectId);
        }

        return requirement;
    }

    private void validateVersionRequest(CreateRequirementVersionRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Version creation request payload must not be null.");
        }
        if (request.getTitle() == null || request.getTitle().trim().isEmpty()) {
            throw new IllegalArgumentException("Title is required.");
        }
        if (request.getDescription() == null || request.getDescription().trim().isEmpty()) {
            throw new IllegalArgumentException("Description is required.");
        }
        if (request.getChangeSummary() == null || request.getChangeSummary().trim().isEmpty()) {
            throw new IllegalArgumentException("Change summary is required.");
        }
        if (request.getChangeType() == null) {
            throw new IllegalArgumentException("Change type is required.");
        }
    }
}
