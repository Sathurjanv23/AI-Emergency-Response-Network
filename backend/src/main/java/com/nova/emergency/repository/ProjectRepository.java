package com.nova.emergency.repository;

import com.nova.emergency.model.Project;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends MongoRepository<Project, String> {

    List<Project> findByOwnerId(String ownerId);

    List<Project> findByOwnerIdOrderByCreatedAtDesc(String ownerId);

    List<Project> findByOwnerIdAndStatusOrderByCreatedAtDesc(String ownerId, String status);

    Optional<Project> findByIdAndOwnerId(String id, String ownerId);

    boolean existsByIdAndOwnerId(String id, String ownerId);
}
