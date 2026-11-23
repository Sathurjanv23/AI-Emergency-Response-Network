package com.nova.emergency.model;

/**
 * Supported artifact types in the ReqTrace AI traceability network.
 * Identifies the domain or external artifact at either end of a traceability link.
 */
public enum TraceabilityArtifactType {
    REQUIREMENT,
    TEST_CASE,
    CODE_REFERENCE,
    GITHUB_COMMIT,
    GITHUB_PULL_REQUEST;

    public static TraceabilityArtifactType fromString(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        for (TraceabilityArtifactType type : values()) {
            if (type.name().equalsIgnoreCase(value.trim())) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown traceability artifact type: " + value);
    }
}
