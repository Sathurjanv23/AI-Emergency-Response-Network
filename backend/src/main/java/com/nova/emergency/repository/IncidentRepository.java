package com.nova.emergency.repository;

import com.nova.emergency.model.Incident;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface IncidentRepository extends MongoRepository<Incident, String> {
    List<Incident> findBySeverityOrderByPriorityAsc(String severity);
    List<Incident> findByStatusOrderByPriorityAsc(String status);
    List<Incident> findByLocationDistrictOrderByPriorityAsc(String district);
    List<Incident> findByStatusNotInOrderByPriorityAsc(List<String> statuses);
    long countBySeverity(String severity);
    long countByStatus(String status);
}
