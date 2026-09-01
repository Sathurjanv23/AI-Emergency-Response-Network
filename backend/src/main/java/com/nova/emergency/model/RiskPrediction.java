package com.nova.emergency.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "risk_predictions")
public class RiskPrediction {

    @Id
    private String id;

    private String zone;
    private String district;
    private GeoLocation location;

    private int floodRisk;      // 0-100
    private int landslideRisk;
    private int fireRisk;
    private int overallRisk;

    // critical | high | medium | low
    private String riskLevel;

    private double rainfall;        // mm
    private double riverLevel;      // meters
    private double temperature;     // celsius
    private double windSpeed;

    private int populationDensity;
    private int predictionWindow;   // 1 | 3 | 6 hours
    private int confidence;

    private List<String> aiRecommendations;
    private String historicalComparison;
    private int affectedPopulation;
    private String updatedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GeoLocation {
        private double lat;
        private double lng;
    }
}
