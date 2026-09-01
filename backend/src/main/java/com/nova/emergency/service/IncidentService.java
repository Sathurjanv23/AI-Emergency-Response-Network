package com.nova.emergency.service;

import com.nova.emergency.model.Incident;
import com.nova.emergency.model.AuditLog;
import com.nova.emergency.repository.IncidentRepository;
import com.nova.emergency.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final AuditLogRepository auditLogRepository;

    public List<Incident> getAll(String severity, String status) {
        if (severity != null && !severity.isEmpty()) {
            return incidentRepository.findBySeverityOrderByPriorityAsc(severity);
        }
        if (status != null && !status.isEmpty()) {
            return incidentRepository.findByStatusOrderByPriorityAsc(status);
        }
        return incidentRepository.findAll();
    }

    public Optional<Incident> getById(String id) {
        return incidentRepository.findById(id);
    }

    public Incident create(Map<String, Object> data, String reportedByEmail) {
        Incident incident = new Incident();
        incident.setId("NOV-" + (int)(Math.random() * 9000 + 1000));
        incident.setStatus("reported");
        incident.setReportedAt(Instant.now().toString());
        incident.setUpdatedAt(Instant.now().toString());

        // Map fields from request
        if (data.containsKey("type")) incident.setType((String) data.get("type"));
        if (data.containsKey("severity")) incident.setSeverity((String) data.get("severity"));
        if (data.containsKey("title")) incident.setTitle((String) data.get("title"));
        if (data.containsKey("description")) incident.setDescription((String) data.get("description"));
        if (data.containsKey("reporterName")) incident.setReporterName((String) data.get("reporterName"));
        if (data.containsKey("reportedBy")) incident.setReportedBy((String) data.get("reportedBy"));
        if (data.containsKey("peopleAffected")) incident.setPeopleAffected((Integer) data.get("peopleAffected"));

        Incident saved = incidentRepository.save(incident);
        log.info("Incident created: {}", saved.getId());
        return saved;
    }

    public Incident update(String id, Map<String, Object> data) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Incident not found: " + id));

        if (data.containsKey("status")) incident.setStatus((String) data.get("status"));
        if (data.containsKey("severity")) incident.setSeverity((String) data.get("severity"));
        if (data.containsKey("assignedTeam")) incident.setAssignedTeam((String) data.get("assignedTeam"));
        if (data.containsKey("assignedTeamName")) incident.setAssignedTeamName((String) data.get("assignedTeamName"));
        if (data.containsKey("eta")) incident.setEta((Integer) data.get("eta"));
        if (data.containsKey("priority")) incident.setPriority((Integer) data.get("priority"));
        incident.setUpdatedAt(Instant.now().toString());

        return incidentRepository.save(incident);
    }

    public Incident assignTeam(String incidentId, String teamId, String teamName, String officerEmail) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new IllegalArgumentException("Incident not found: " + incidentId));

        incident.setAssignedTeam(teamId);
        incident.setAssignedTeamName(teamName);
        incident.setStatus("assigned");
        incident.setUpdatedAt(Instant.now().toString());

        // Add update entry
        Incident.IncidentUpdate updateEntry = new Incident.IncidentUpdate(
            UUID.randomUUID().toString(),
            "assigned",
            "Team " + teamName + " assigned to this incident.",
            officerEmail,
            Instant.now().toString(),
            false
        );
        if (incident.getUpdates() != null) {
            incident.getUpdates().add(updateEntry);
        }

        // Log audit
        logAudit(officerEmail, "ASSIGN_TEAM", "incident", incidentId,
            "Assigned team " + teamName + " to incident " + incidentId);

        return incidentRepository.save(incident);
    }

    public Incident escalate(String id, String reason, String officerEmail) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Incident not found: " + id));

        // Escalate severity
        String currentSeverity = incident.getSeverity();
        String newSeverity = switch (currentSeverity) {
            case "low" -> "medium";
            case "medium" -> "high";
            case "high" -> "critical";
            default -> "critical";
        };
        incident.setSeverity(newSeverity);
        incident.setUpdatedAt(Instant.now().toString());

        logAudit(officerEmail, "ESCALATE_INCIDENT", "incident", id,
            "Escalated from " + currentSeverity + " to " + newSeverity + ". Reason: " + reason);

        return incidentRepository.save(incident);
    }

    public Incident resolve(String id, String resolution, String officerEmail) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Incident not found: " + id));

        incident.setStatus("resolved");
        incident.setUpdatedAt(Instant.now().toString());

        Incident.IncidentUpdate updateEntry = new Incident.IncidentUpdate(
            UUID.randomUUID().toString(),
            "resolved",
            resolution,
            officerEmail,
            Instant.now().toString(),
            false
        );
        if (incident.getUpdates() != null) {
            incident.getUpdates().add(updateEntry);
        }

        logAudit(officerEmail, "RESOLVE_INCIDENT", "incident", id, "Incident resolved: " + resolution);
        return incidentRepository.save(incident);
    }

    private void logAudit(String userEmail, String action, String resource, String resourceId, String details) {
        AuditLog log = new AuditLog();
        log.setId(UUID.randomUUID().toString());
        log.setUserId(userEmail);
        log.setUserName(userEmail);
        log.setAction(action);
        log.setResource(resource);
        log.setResourceId(resourceId);
        log.setDetails(details);
        log.setTimestamp(Instant.now().toString());
        log.setSeverity("info");
        auditLogRepository.save(log);
    }
}
