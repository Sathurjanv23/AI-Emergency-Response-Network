package com.nova.emergency.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RequirementVersionComparisonResponse {
    private String requirementId;
    private Integer fromVersion;
    private Integer toVersion;
    private boolean hasChanges;
    private List<FieldComparison> changedFields;
    private List<String> unchangedFields;

    public String getRequirementId() { return requirementId; }
    public void setRequirementId(String requirementId) { this.requirementId = requirementId; }

    public Integer getFromVersion() { return fromVersion; }
    public void setFromVersion(Integer fromVersion) { this.fromVersion = fromVersion; }

    public Integer getToVersion() { return toVersion; }
    public void setToVersion(Integer toVersion) { this.toVersion = toVersion; }

    public boolean isHasChanges() { return hasChanges; }
    public void setHasChanges(boolean hasChanges) { this.hasChanges = hasChanges; }

    public List<FieldComparison> getChangedFields() { return changedFields; }
    public void setChangedFields(List<FieldComparison> changedFields) { this.changedFields = changedFields; }

    public List<String> getUnchangedFields() { return unchangedFields; }
    public void setUnchangedFields(List<String> unchangedFields) { this.unchangedFields = unchangedFields; }
}
