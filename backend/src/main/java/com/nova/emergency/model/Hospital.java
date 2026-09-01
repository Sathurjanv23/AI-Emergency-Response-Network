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
@Document(collection = "hospitals")
public class Hospital {

    @Id
    private String id;

    private String name;
    // general | specialist | field | teaching
    private String type;
    private String district;
    private GeoLocation location;
    private String contact;

    private int totalBeds;
    private int availableBeds;
    private int icuTotal;
    private int icuAvailable;
    private int emergencyTeams;

    private List<AmbulanceUnit> ambulances;
    private List<IncomingCase> incomingCases;
    private List<String> specializations;

    private boolean isActive = true;
    private String lastUpdated;

    // ─── Nested types ────────────────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GeoLocation {
        private double lat;
        private double lng;
        private String address;
        private String district;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AmbulanceUnit {
        private String id;
        private String code;
        private String status; // available | dispatched | maintenance
        private Integer eta;
        private String assignedCase;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IncomingCase {
        private String id;
        private String incidentId;
        private String severity;
        private int eta;
        private int patientCount;
        private String condition;
        private List<String> requiredCare;
        private String ambulanceId;
    }
}
