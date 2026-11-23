package com.nova.emergency.model;

/**
 * Status lifecycle of a traceability link.
 * ACTIVE: The link is currently valid and in effect.
 * INACTIVE: The link has been retired, superseded, or soft-deleted.
 */
public enum TraceabilityLinkStatus {
    ACTIVE,
    INACTIVE;

    public boolean isActive() {
        return this == ACTIVE;
    }

    public static TraceabilityLinkStatus fromString(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        for (TraceabilityLinkStatus status : values()) {
            if (status.name().equalsIgnoreCase(value.trim())) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown traceability link status: " + value);
    }
}
