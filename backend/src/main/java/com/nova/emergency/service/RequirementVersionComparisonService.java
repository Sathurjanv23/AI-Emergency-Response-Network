package com.nova.emergency.service;

import com.nova.emergency.dto.FieldComparison;
import com.nova.emergency.dto.RequirementVersionComparisonResponse;
import com.nova.emergency.exception.ResourceNotFoundException;
import com.nova.emergency.model.Project;
import com.nova.emergency.model.Requirement;
import com.nova.emergency.model.RequirementVersion;
import com.nova.emergency.repository.ProjectRepository;
import com.nova.emergency.repository.RequirementRepository;
import com.nova.emergency.repository.RequirementVersionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class RequirementVersionComparisonService {

    private static final Logger log = LoggerFactory.getLogger(RequirementVersionComparisonService.class);

    private final RequirementVersionRepository versionRepository;
    private final RequirementRepository requirementRepository;
    private final ProjectRepository projectRepository;

    public RequirementVersionComparisonService(RequirementVersionRepository versionRepository,
                                               RequirementRepository requirementRepository,
                                               ProjectRepository projectRepository) {
        this.versionRepository = versionRepository;
        this.requirementRepository = requirementRepository;
        this.projectRepository = projectRepository;
    }

    public RequirementVersionComparisonResponse compareVersions(String projectId,
                                                                String requirementId,
                                                                Integer fromVersion,
                                                                Integer toVersion,
                                                                String authenticatedUserId) {
        if (fromVersion == null || fromVersion <= 0 || toVersion == null || toVersion <= 0) {
            throw new IllegalArgumentException("Version comparison parameters 'from' and 'to' must be positive integers.");
        }

        validateProjectAndRequirement(projectId, requirementId, authenticatedUserId);

        RequirementVersion vFrom = versionRepository
                .findByProjectIdAndRequirementIdAndVersionNumber(projectId, requirementId, fromVersion)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Requirement version " + fromVersion + " not found for requirement: " + requirementId));

        RequirementVersion vTo = versionRepository
                .findByProjectIdAndRequirementIdAndVersionNumber(projectId, requirementId, toVersion)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Requirement version " + toVersion + " not found for requirement: " + requirementId));

        return compare(vFrom, vTo);
    }

    public RequirementVersionComparisonResponse compare(RequirementVersion vFrom, RequirementVersion vTo) {
        if (vFrom == null || vTo == null) {
            throw new IllegalArgumentException("Versions to compare cannot be null.");
        }

        List<FieldComparison> changedFields = new ArrayList<>();
        List<String> unchangedFields = new ArrayList<>();

        // 1. Title
        compareTextField("title", vFrom.getTitle(), vTo.getTitle(), changedFields, unchangedFields);

        // 2. Description
        compareTextField("description", vFrom.getDescription(), vTo.getDescription(), changedFields, unchangedFields);

        // 3. ChangeType
        String fromType = vFrom.getChangeType() != null ? vFrom.getChangeType().name() : null;
        String toType = vTo.getChangeType() != null ? vTo.getChangeType().name() : null;
        compareEnumField("changeType", fromType, toType, changedFields, unchangedFields);

        // 4. ReviewStatus
        String fromStatus = vFrom.getReviewStatus() != null ? vFrom.getReviewStatus().name() : null;
        String toStatus = vTo.getReviewStatus() != null ? vTo.getReviewStatus().name() : null;
        compareEnumField("reviewStatus", fromStatus, toStatus, changedFields, unchangedFields);

        boolean hasChanges = !changedFields.isEmpty();

        return RequirementVersionComparisonResponse.builder()
                .requirementId(vTo.getRequirementId() != null ? vTo.getRequirementId() : vFrom.getRequirementId())
                .fromVersion(vFrom.getVersionNumber())
                .toVersion(vTo.getVersionNumber())
                .hasChanges(hasChanges)
                .changedFields(changedFields)
                .unchangedFields(unchangedFields)
                .build();
    }

    private void compareTextField(String fieldName,
                                  String oldValue,
                                  String newValue,
                                  List<FieldComparison> changedFields,
                                  List<String> unchangedFields) {
        String safeOld = oldValue != null ? oldValue : "";
        String safeNew = newValue != null ? newValue : "";

        if (safeOld.equals(safeNew)) {
            unchangedFields.add(fieldName);
            return;
        }

        DiffResult diffResult = computeTokenDiff(safeOld, safeNew);

        changedFields.add(FieldComparison.builder()
                .field(fieldName)
                .oldValue(oldValue)
                .newValue(newValue)
                .addedText(diffResult.addedTokens)
                .removedText(diffResult.removedTokens)
                .build());
    }

    private void compareEnumField(String fieldName,
                                  String oldValue,
                                  String newValue,
                                  List<FieldComparison> changedFields,
                                  List<String> unchangedFields) {
        if (Objects.equals(oldValue, newValue)) {
            unchangedFields.add(fieldName);
            return;
        }

        List<String> added = newValue != null ? List.of(newValue) : List.of();
        List<String> removed = oldValue != null ? List.of(oldValue) : List.of();

        changedFields.add(FieldComparison.builder()
                .field(fieldName)
                .oldValue(oldValue)
                .newValue(newValue)
                .addedText(added)
                .removedText(removed)
                .build());
    }

    public DiffResult computeTokenDiff(String oldText, String newText) {
        String[] tokensA = tokenize(oldText);
        String[] tokensB = tokenize(newText);

        if (tokensA.length == 0 && tokensB.length == 0) {
            return new DiffResult(List.of(), List.of());
        }
        if (tokensA.length == 0) {
            return new DiffResult(Arrays.asList(tokensB), List.of());
        }
        if (tokensB.length == 0) {
            return new DiffResult(List.of(), Arrays.asList(tokensA));
        }

        int n = tokensA.length;
        int m = tokensB.length;
        int[][] dp = new int[n + 1][m + 1];

        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                if (tokensA[i].equals(tokensB[j])) {
                    dp[i + 1][j + 1] = dp[i][j] + 1;
                } else {
                    dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
                }
            }
        }

        List<DiffToken> diffTokens = new ArrayList<>();
        int i = n, j = m;
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && tokensA[i - 1].equals(tokensB[j - 1])) {
                i--;
                j--;
            } else if (j > 0 && (i == 0 || dp[i][j - 1] >= dp[i - 1][j])) {
                diffTokens.add(new DiffToken(DiffType.ADDED, tokensB[j - 1]));
                j--;
            } else if (i > 0 && (j == 0 || dp[i][j - 1] < dp[i - 1][j])) {
                diffTokens.add(new DiffToken(DiffType.REMOVED, tokensA[i - 1]));
                i--;
            }
        }

        Collections.reverse(diffTokens);

        List<String> added = new ArrayList<>();
        List<String> removed = new ArrayList<>();
        for (DiffToken dt : diffTokens) {
            if (dt.type == DiffType.ADDED) {
                added.add(dt.text);
            } else if (dt.type == DiffType.REMOVED) {
                removed.add(dt.text);
            }
        }

        return new DiffResult(added, removed);
    }

    private String[] tokenize(String text) {
        if (text == null || text.trim().isEmpty()) {
            return new String[0];
        }
        return text.trim().split("\\s+");
    }

    private void validateProjectAndRequirement(String projectId, String requirementId, String authenticatedUserId) {
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
    }

    public static class DiffResult {
        public final List<String> addedTokens;
        public final List<String> removedTokens;

        public DiffResult(List<String> addedTokens, List<String> removedTokens) {
            this.addedTokens = addedTokens;
            this.removedTokens = removedTokens;
        }
    }

    private static class DiffToken {
        final DiffType type;
        final String text;

        DiffToken(DiffType type, String text) {
            this.type = type;
            this.text = text;
        }
    }

    private enum DiffType {
        ADDED, REMOVED
    }
}
