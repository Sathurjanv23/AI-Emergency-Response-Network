package com.nova.emergency.controller;

import com.nova.emergency.dto.ApiResponse;
import com.nova.emergency.model.Notification;
import com.nova.emergency.model.RiskPrediction;
import com.nova.emergency.repository.NotificationRepository;
import com.nova.emergency.repository.RiskPredictionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * AlertController — Provides live alert data for the top ticker and alert panel.
 *
 * GET /api/alerts/live — Returns current live alerts from real backend data.
 * No hardcoded/mock alerts. If no alerts exist, returns empty list.
 */
@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final NotificationRepository notificationRepository;
    private final RiskPredictionRepository riskPredictionRepository;

    /**
     * Returns the most recent unread alerts for the top ticker.
     * Aggregates notifications + active risk predictions.
     * No mock data — returns empty list if nothing in DB.
     */
    @GetMapping("/live")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getLiveAlerts() {
        List<Map<String, Object>> alerts = new ArrayList<>();

        // Recent unread notifications (last 20)
        List<Notification> notifications = notificationRepository.findByReadFalseOrderByCreatedAtDesc();
        notifications.stream()
            .limit(20)
            .forEach(n -> alerts.add(Map.of(
                "id", n.getId() != null ? n.getId() : "",
                "type", "notification",
                "message", n.getMessage() != null ? n.getMessage() : "",
                "severity", n.getSeverity() != null ? n.getSeverity() : "low",
                "timestamp", n.getCreatedAt() != null ? n.getCreatedAt() : ""
            )));

        // Active risk predictions with high risk
        List<RiskPrediction> riskPredictions = riskPredictionRepository.findAll();
        riskPredictions.stream()
            .filter(rp -> rp.getFloodRisk() >= 70)
            .limit(5)
            .forEach(rp -> alerts.add(Map.of(
                "id", rp.getId() != null ? rp.getId() : "",
                "type", "risk_prediction",
                "message", buildRiskMessage(rp),
                "severity", rp.getRiskLevel() != null ? rp.getRiskLevel() : "high",
                "timestamp", rp.getUpdatedAt() != null ? rp.getUpdatedAt() : ""
            )));

        // Sort by timestamp descending (most recent first)
        alerts.sort((a, b) -> {
            String ta = (String) a.getOrDefault("timestamp", "");
            String tb = (String) b.getOrDefault("timestamp", "");
            return tb.compareTo(ta);
        });

        return ResponseEntity.ok(ApiResponse.ok(alerts.stream().limit(10).collect(Collectors.toList())));
    }

    private String buildRiskMessage(RiskPrediction rp) {
        StringBuilder msg = new StringBuilder();
        if (rp.getZone() != null) msg.append(rp.getZone()).append(": ");
        if (rp.getFloodRisk() >= 70) {
            msg.append("Flood risk ").append(rp.getFloodRisk()).append("%");
        }
        if (rp.getRiverLevel() > 0) {
            msg.append(" — River level ").append(String.format("%.1fm", rp.getRiverLevel()));
        }
        return msg.length() > 0 ? msg.toString() : "Elevated risk detected";
    }
}
