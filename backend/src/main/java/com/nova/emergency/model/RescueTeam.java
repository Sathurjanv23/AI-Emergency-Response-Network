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
@Document(collection = "rescue_teams")
public class RescueTeam {

    @Id
    private String id;

    private String name;
    private String code;

    // available | assigned | en_route | on_scene | unavailable
    private String status;

    private GeoLocation location;
    private List<TeamMember> members;
    private List<Equipment> equipment;
    private List<String> capabilities;

    private String district;
    private String contact;
    private String vehicleType;

    private String currentIncident;
    private Integer eta;
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
    public static class TeamMember {
        private String id;
        private String name;
        private String role;
        private String status; // active | standby | off_duty
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Equipment {
        private String type;
        private int quantity;
        private String status; // available | in_use | maintenance
    }
}
