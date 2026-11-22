package com.nova.emergency.model;

public enum ChangeType {
    CREATED,
    UPDATED,
    CLARIFIED,
    CORRECTED;

    public static ChangeType fromString(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        for (ChangeType type : values()) {
            if (type.name().equalsIgnoreCase(value.trim())) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown change type: " + value);
    }
}
