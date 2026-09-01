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
@Document(collection = "notifications")
public class Notification {

    @Id
    private String id;

    // critical_incident | new_assignment | weather_alert | resource_shortage | hospital_capacity | prediction_alert | system_alert | team_status | simulation
    private String type;

    private String title;
    private String message;

    // critical | high | medium | low
    private String severity;

    private boolean read = false;
    private String createdAt;
    private String relatedId;
    private String relatedType;

    // Target roles for filtering: citizen | officer | rescue_team | hospital | admin
    private List<String> targetRole;
}
