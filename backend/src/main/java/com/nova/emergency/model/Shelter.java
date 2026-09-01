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
@Document(collection = "shelters")
public class Shelter {

    @Id
    private String id;

    private String name;
    private GeoLocation location;

    private int capacity;
    private int currentOccupancy;

    // active | standby | full | closed
    private String status;

    private List<String> amenities;
    private String contact;
    private String district;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GeoLocation {
        private double lat;
        private double lng;
        private String address;
        private String district;
    }
}
