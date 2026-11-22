package com.nova.emergency.model;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public enum ReviewStatus {
    DRAFT,
    IN_REVIEW,
    APPROVED,
    REJECTED;

    private static final Map<ReviewStatus, Set<ReviewStatus>> ALLOWED_TRANSITIONS = Map.of(
            DRAFT, EnumSet.of(DRAFT, IN_REVIEW),
            IN_REVIEW, EnumSet.of(IN_REVIEW, APPROVED, REJECTED),
            APPROVED, EnumSet.of(APPROVED),
            REJECTED, EnumSet.of(REJECTED)
    );

    public boolean canTransitionTo(ReviewStatus target) {
        if (target == null) {
            return false;
        }
        Set<ReviewStatus> allowed = ALLOWED_TRANSITIONS.get(this);
        return allowed != null && allowed.contains(target);
    }

    public static ReviewStatus fromString(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        for (ReviewStatus status : values()) {
            if (status.name().equalsIgnoreCase(value.trim())) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown review status: " + value);
    }
}
