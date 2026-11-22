package com.nova.emergency.service;

import com.nova.emergency.dto.CreateRequirementVersionRequest;
import com.nova.emergency.dto.RequirementVersionResponse;
import com.nova.emergency.exception.InvalidStatusTransitionException;
import com.nova.emergency.exception.ResourceNotFoundException;
import com.nova.emergency.model.AuditLog;
import com.nova.emergency.model.ChangeType;
import com.nova.emergency.model.Project;
import com.nova.emergency.model.Requirement;
import com.nova.emergency.model.RequirementVersion;
import com.nova.emergency.model.ReviewStatus;
import com.nova.emergency.repository.AuditLogRepository;
import com.nova.emergency.repository.ProjectRepository;
import com.nova.emergency.repository.RequirementRepository;
import com.nova.emergency.repository.RequirementVersionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Autowired(required = false)
    private AuditLogRepository auditLogRepository;

    public RequirementVersionService(RequirementVersionRepository versionRepository,
                                     RequirementRepository requirementRepository,
                                     ProjectRepository projectRepository) {
        this.versionRepository = versionRepository;
        this.requirementRepository = requirementRepository;
        this.projectRepository = projectRepository;
    }

    public RequirementVersionService(RequirementVersionRepository versionRepository,
                                     RequirementRepository requirementRepository,
                                     ProjectRepository projectRepository,
                                     AuditLogRepository auditLogRepository) {
        this.versionRepository = versionRepository;
        this.requirementRepository = requirementRepository;
        this.projectRepository = projectRepository;
        this.auditLogRepository = auditLogRepository;
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

    public RequirementVersionResponse submitForReview(String projectId,
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

        if (version.getReviewStatus() == ReviewStatus.IN_REVIEW) {
            throw new InvalidStatusTransitionException(
                    "Duplicate submission rejected: Version " + versionNumber + " is already in review.");
        }

        if (version.getReviewStatus() != ReviewStatus.DRAFT) {
            throw new InvalidStatusTransitionException(
                    "Invalid state transition: Cannot submit version in status " + version.getReviewStatus() + " for review. Must be in DRAFT.");
        }

        version.setReviewStatus(ReviewStatus.IN_REVIEW);
        RequirementVersion saved = versionRepository.save(version);

        log.info("Requirement version {} submitted for review for requirement {} in project {} by user {}",
                versionNumber, requirementId, projectId, authenticatedUserId);
        recordAuditLog(authenticatedUserId, "SUBMIT_REQUIREMENT_VERSION_FOR_REVIEW", saved.getId(),
                "Submitted version " + versionNumber + " for review");

        return RequirementVersionResponse.from(saved);
    }

    @Transactional
    public RequirementVersionResponse approveVersion(String projectId,
                                                     String requirementId,
                                                     Integer versionNumber,
                                                     String reviewComment,
                                                     String authenticatedUserId) {
        Requirement requirement = validateAndGetRequirement(projectId, requirementId, authenticatedUserId);

        if (versionNumber == null || versionNumber <= 0) {
            throw new IllegalArgumentException("Version number must be a positive integer.");
        }

        RequirementVersion version = versionRepository
                .findByProjectIdAndRequirementIdAndVersionNumber(projectId, requirementId, versionNumber)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Requirement version " + versionNumber + " not found for requirement: " + requirementId));

        if (version.getReviewStatus() == ReviewStatus.APPROVED) {
            throw new InvalidStatusTransitionException(
                    "Duplicate approval rejected: Version " + versionNumber + " is already approved.");
        }

        if (version.getReviewStatus() == ReviewStatus.DRAFT) {
            throw new InvalidStatusTransitionException(
                    "Invalid state transition: Cannot directly approve version in DRAFT status. Must be submitted for review first.");
        }

        if (version.getReviewStatus() != ReviewStatus.IN_REVIEW) {
            throw new InvalidStatusTransitionException(
                    "Invalid state transition: Cannot approve version in status " + version.getReviewStatus() + ". Must be in IN_REVIEW.");
        }

        // Stale approval protection: Check if a newer version is already approved
        Optional<RequirementVersion> latestApproved = versionRepository
                .findFirstByProjectIdAndRequirementIdAndReviewStatusOrderByVersionNumberDesc(
                        projectId, requirementId, ReviewStatus.APPROVED);

        if (latestApproved.isPresent() && latestApproved.get().getVersionNumber() > versionNumber) {
            throw new InvalidStatusTransitionException(
                    "Stale version approval rejected: Version " + latestApproved.get().getVersionNumber()
                            + " is already approved. Cannot approve older version " + versionNumber + ".");
        }

        String now = Instant.now().toString();

        // Snapshot original version state for defensive compensation rollback
        ReviewStatus previousStatus = version.getReviewStatus();
        String previousReviewedBy = version.getReviewedBy();
        String previousReviewedAt = version.getReviewedAt();
        String previousApprovedBy = version.getApprovedBy();
        String previousApprovedAt = version.getApprovedAt();
        String previousComment = version.getReviewComment();

        // 1. Update version metadata
        version.setReviewStatus(ReviewStatus.APPROVED);
        version.setReviewedBy(authenticatedUserId);
        version.setReviewedAt(now);
        version.setApprovedBy(authenticatedUserId);
        version.setApprovedAt(now);
        if (reviewComment != null && !reviewComment.isBlank()) {
            version.setReviewComment(reviewComment.trim());
        }

        RequirementVersion savedVersion = versionRepository.save(version);

        // 2. Synchronize active requirement document
        try {
            requirement.setCurrentVersionId(savedVersion.getId());
            requirement.setTitle(savedVersion.getTitle());
            requirement.setDescription(savedVersion.getDescription());
            requirement.setStatus(Requirement.STATUS_APPROVED);
            requirement.setUpdatedAt(now);
            requirementRepository.save(requirement);
        } catch (Exception e) {
            log.error("Cross-document consistency failure during approval of version {}. Executing compensation rollback.", versionNumber, e);
            // Compensate: rollback version document
            version.setReviewStatus(previousStatus);
            version.setReviewedBy(previousReviewedBy);
            version.setReviewedAt(previousReviewedAt);
            version.setApprovedBy(previousApprovedBy);
            version.setApprovedAt(previousApprovedAt);
            version.setReviewComment(previousComment);
            versionRepository.save(version);
            throw new IllegalStateException("Failed to update active requirement during approval. Transaction compensated and rolled back: " + e.getMessage(), e);
        }

        log.info("Requirement version {} approved for requirement {} in project {} by reviewer {}",
                versionNumber, requirementId, projectId, authenticatedUserId);
        recordAuditLog(authenticatedUserId, "APPROVE_REQUIREMENT_VERSION", savedVersion.getId(),
                "Approved version " + versionNumber + " for requirement " + requirementId);

        return RequirementVersionResponse.from(savedVersion);
    }

    public RequirementVersionResponse rejectVersion(String projectId,
                                                    String requirementId,
                                                    Integer versionNumber,
                                                    String reviewComment,
                                                    String authenticatedUserId) {
        validateAndGetRequirement(projectId, requirementId, authenticatedUserId);

        if (versionNumber == null || versionNumber <= 0) {
            throw new IllegalArgumentException("Version number must be a positive integer.");
        }

        if (reviewComment == null || reviewComment.trim().isEmpty()) {
            throw new IllegalArgumentException("Rejection comment is required.");
        }

        RequirementVersion version = versionRepository
                .findByProjectIdAndRequirementIdAndVersionNumber(projectId, requirementId, versionNumber)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Requirement version " + versionNumber + " not found for requirement: " + requirementId));

        if (version.getReviewStatus() == ReviewStatus.REJECTED) {
            throw new InvalidStatusTransitionException(
                    "Duplicate rejection rejected: Version " + versionNumber + " is already rejected.");
        }

        if (version.getReviewStatus() == ReviewStatus.APPROVED) {
            throw new InvalidStatusTransitionException(
                    "Invalid state transition: Cannot reject already approved version " + versionNumber + ".");
        }

        if (version.getReviewStatus() == ReviewStatus.DRAFT) {
            throw new InvalidStatusTransitionException(
                    "Invalid state transition: Cannot directly reject version in DRAFT status. Must be in IN_REVIEW.");
        }

        if (version.getReviewStatus() != ReviewStatus.IN_REVIEW) {
            throw new InvalidStatusTransitionException(
                    "Invalid state transition: Cannot reject version in status " + version.getReviewStatus() + ". Must be in IN_REVIEW.");
        }

        String now = Instant.now().toString();
        version.setReviewStatus(ReviewStatus.REJECTED);
        version.setReviewedBy(authenticatedUserId);
        version.setReviewedAt(now);
        version.setReviewComment(reviewComment.trim());

        // Note: Rejected version is NEVER deleted; Requirement.currentVersionId is NOT modified
        RequirementVersion saved = versionRepository.save(version);

        log.info("Requirement version {} rejected for requirement {} in project {} by reviewer {}",
                versionNumber, requirementId, projectId, authenticatedUserId);
        recordAuditLog(authenticatedUserId, "REJECT_REQUIREMENT_VERSION", saved.getId(),
                "Rejected version " + versionNumber + " with comment: " + reviewComment.trim());

        return RequirementVersionResponse.from(saved);
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

    private void recordAuditLog(String userId, String action, String resourceId, String details) {
        if (auditLogRepository != null) {
            try {
                AuditLog logEntry = new AuditLog();
                logEntry.setUserId(userId);
                logEntry.setAction(action);
                logEntry.setResource("requirement_version");
                logEntry.setResourceId(resourceId);
                logEntry.setDetails(details);
                logEntry.setSeverity("info");
                logEntry.setTimestamp(Instant.now().toString());
                auditLogRepository.save(logEntry);
            } catch (Exception e) {
                log.warn("Could not save audit log for action {}: {}", action, e.getMessage());
            }
        }
    }
}
