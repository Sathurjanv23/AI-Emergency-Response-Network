package com.nova.emergency.controller;

import com.nova.emergency.dto.ApiResponse;
import com.nova.emergency.model.Incident;
import com.nova.emergency.service.IncidentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/incidents")
@RequiredArgsConstructor
public class IncidentController {

    private final IncidentService incidentService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Incident>>> getAll(
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String status) {
        List<Incident> incidents = incidentService.getAll(severity, status);
        ApiResponse<List<Incident>> response = ApiResponse.ok(incidents);
        response.setMeta(new ApiResponse.Meta((long) incidents.size(), null, null));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Incident>> getById(@PathVariable String id) {
        return incidentService.getById(id)
                .map(inc -> ResponseEntity.ok(ApiResponse.ok(inc)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Incident>> create(
            @RequestBody Map<String, Object> data,
            Authentication auth) {
        Incident created = incidentService.create(data, auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(created, "Incident created"));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<Incident>> update(
            @PathVariable String id,
            @RequestBody Map<String, Object> data) {
        Incident updated = incidentService.update(id, data);
        return ResponseEntity.ok(ApiResponse.ok(updated, "Incident updated"));
    }

    @PostMapping("/{incidentId}/assign")
    public ResponseEntity<ApiResponse<Incident>> assignTeam(
            @PathVariable String incidentId,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        String teamId = body.get("teamId");
        String teamName = body.getOrDefault("teamName", teamId);
        Incident updated = incidentService.assignTeam(incidentId, teamId, teamName, auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(updated, "Team assigned"));
    }

    @PostMapping("/{id}/escalate")
    public ResponseEntity<ApiResponse<Incident>> escalate(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        String reason = body.getOrDefault("reason", "Manual escalation");
        Incident updated = incidentService.escalate(id, reason, auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(updated, "Incident escalated"));
    }

    @PostMapping("/{id}/resolve")
    public ResponseEntity<ApiResponse<Incident>> resolve(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        String resolution = body.getOrDefault("resolution", "Incident resolved");
        Incident updated = incidentService.resolve(id, resolution, auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(updated, "Incident resolved"));
    }
}
