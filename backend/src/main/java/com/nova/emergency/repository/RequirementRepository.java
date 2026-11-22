package com.nova.emergency.repository;

import com.nova.emergency.model.Requirement;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RequirementRepository extends MongoRepository<Requirement, String> {

    List<Requirement> findByProjectId(String projectId);

    List<Requirement> findByProjectIdOrderByCreatedAtDesc(String projectId);

    List<Requirement> findByProjectIdAndStatusOrderByCreatedAtDesc(String projectId, String status);

    Optional<Requirement> findByIdAndProjectId(String id, String projectId);

    Optional<Requirement> findByProjectIdAndRequirementKey(String projectId, String requirementKey);

    boolean existsByIdAndProjectId(String id, String projectId);

    boolean existsByProjectIdAndRequirementKey(String projectId, String requirementKey);

    long countByProjectId(String projectId);

    void deleteByIdAndProjectId(String id, String projectId);
}
