package com.nova.emergency.repository;

import com.nova.emergency.model.Document;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends MongoRepository<Document, String> {

    List<Document> findByProjectId(String projectId);

    List<Document> findByProjectIdOrderByCreatedAtDesc(String projectId);

    List<Document> findByProjectIdAndStatusOrderByCreatedAtDesc(String projectId, String status);

    Optional<Document> findByIdAndProjectId(String id, String projectId);

    boolean existsByIdAndProjectId(String id, String projectId);

    long countByProjectId(String projectId);

    long countByProjectIdAndStatus(String projectId, String status);

    void deleteByIdAndProjectId(String id, String projectId);
}
