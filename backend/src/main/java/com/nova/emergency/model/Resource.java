package com.nova.emergency.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "resources")
public class Resource {

    @Id
    private String id;

    // ambulance | rescue_boat | fire_vehicle | medical_kit | food_pack | water_unit | medicine | shelter | rescue_personnel
    private String type;
    private String name;

    private int quantity;
    private int available;
    private int reserved;
    private int deployed;

    // available | reserved | deployed | low_stock | critical_stock
    private String status;

    private GeoLocation location;
    private String lastRestocked;
    private String unit;
    private int lowStockThreshold;

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
