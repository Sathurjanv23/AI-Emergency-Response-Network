package com.nova.emergency.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "incidents")
public class Incident {

    @Id
    private String id;

    // flood | landslide | fire | road_accident | medical | missing_person | building_collapse | severe_weather | other
    private String type;

    // critical | high | medium | low
    private String severity;

    // reported | ai_analyzed | prioritized | assigned | en_route | responding | resolved | closed
    private String status;

    private String title;
    private String description;
    private GeoLocation location;

    private String reportedBy;
    private String reporterName;
    private String reporterPhone;
    private String reportedAt;
    private String updatedAt;

    private int peopleAffected;

    private AIAnalysis aiAnalysis;

    private String assignedTeam;
    private String assignedTeamName;
    private String assignedHospital;

    private Integer eta; // minutes
    private Integer priority; // 1 = highest

    private List<IncidentNote> notes;
    private List<Attachment> attachments;
    private List<IncidentUpdate> updates;
    private List<ResourceAllocation> resourcesAllocated;

    private boolean isSimulation = false;

    // ─── Nested types ────────────────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GeoLocation {
        private double lat;
        private double lng;
        private String address;
        private String district;
        private String zone;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AIAnalysis {
        private String id;
        private String incidentId;
        private String emergencyType;
        private String severity;
        private int confidenceScore;
        private int peopleAffected;
        private List<VulnerablePerson> vulnerablePersons;
        private List<ResourceRequirement> requiredResources;
        private String recommendedAction;
        private String detectedLanguage;
        private String processedAt;
        private List<String> inputModalities;
        private List<String> riskFactors;
        private int estimatedResponseTime;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VulnerablePerson {
        private String type; // elderly | child | disabled | pregnant | medical
        private int count;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResourceRequirement {
        private String type;
        private int quantity;
        private String priority; // immediate | urgent | normal
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IncidentNote {
        private String id;
        private String author;
        private String content;
        private String createdAt;
        private boolean isAI;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Attachment {
        private String id;
        private String type; // image | audio | video | document
        private String url;
        private String name;
        private long size;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IncidentUpdate {
        private String id;
        private String status;
        private String message;
        private String updatedBy;
        private String updatedAt;
        private boolean isAI;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResourceAllocation {
        private String resourceId;
        private String resourceType;
        private int quantity;
        private String allocatedAt;
    }
}
