package com.nova.emergency.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "audit_logs")
public class AuditLog {

    @Id
    private String id;

    private String userId;
    private String userName;
    private String action;       // e.g. ASSIGN_TEAM, ESCALATE_INCIDENT, USER_CREATED
    private String resource;     // e.g. incident, team, user
    private String resourceId;
    private String details;
    private String ipAddress;
    private String timestamp;

    // info | warning | critical
    private String severity;
}
