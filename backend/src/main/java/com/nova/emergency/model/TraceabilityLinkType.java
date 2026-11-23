package com.nova.emergency.model;

/**
 * Relationship type between source and target artifacts.
 * Directional convention: SOURCE ARTIFACT ➔ RELATIONSHIP ➔ TARGET ARTIFACT.
 * E.g.:
 *  - REQUIREMENT [DEPENDS_ON] REQUIREMENT (Source requires Target to function)
 *  - REQUIREMENT [IMPLEMENTED_BY] CODE_REFERENCE / GITHUB_COMMIT / GITHUB_PULL_REQUEST
 *  - REQUIREMENT [VERIFIED_BY] TEST_CASE (Test Case verifies Requirement)
 *  - REQUIREMENT [BLOCKS] REQUIREMENT (Source blocks Target completion)
 *  - REQUIREMENT [RELATED_TO] REQUIREMENT (Associative relationship)
 */
public enum TraceabilityLinkType {
    DEPENDS_ON,
    RELATED_TO,
    IMPLEMENTED_BY,
    VERIFIED_BY,
    BLOCKS;

    public static TraceabilityLinkType fromString(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        for (TraceabilityLinkType type : values()) {
            if (type.name().equalsIgnoreCase(value.trim())) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown traceability link type: " + value);
    }
}
