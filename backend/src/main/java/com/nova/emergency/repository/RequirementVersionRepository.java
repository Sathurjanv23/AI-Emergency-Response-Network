package com.nova.emergency.repository;

import com.nova.emergency.model.RequirementVersion;
import com.nova.emergency.model.ReviewStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RequirementVersionRepository extends MongoRepository<RequirementVersion, String> {

    List<RequirementVersion> findByRequirementIdOrderByVersionNumberDesc(String requirementId);

    List<RequirementVersion> findByProjectIdAndRequirementIdOrderByVersionNumberDesc(String projectId, String requirementId);

    Optional<RequirementVersion> findByRequirementIdAndVersionNumber(String requirementId, Integer versionNumber);

    Optional<RequirementVersion> findByProjectIdAndRequirementIdAndVersionNumber(String projectId, String requirementId, Integer versionNumber);

    Optional<RequirementVersion> findFirstByRequirementIdOrderByVersionNumberDesc(String requirementId);

    Optional<RequirementVersion> findFirstByProjectIdAndRequirementIdOrderByVersionNumberDesc(String projectId, String requirementId);

    Optional<RequirementVersion> findFirstByRequirementIdAndReviewStatusOrderByVersionNumberDesc(String requirementId, ReviewStatus reviewStatus);

    Optional<RequirementVersion> findFirstByProjectIdAndRequirementIdAndReviewStatusOrderByVersionNumberDesc(String projectId, String requirementId, ReviewStatus reviewStatus);

    List<RequirementVersion> findByRequirementIdAndReviewStatusOrderByVersionNumberDesc(String requirementId, ReviewStatus reviewStatus);

    List<RequirementVersion> findByProjectIdAndRequirementIdAndReviewStatusOrderByVersionNumberDesc(String projectId, String requirementId, ReviewStatus reviewStatus);

    boolean existsByRequirementIdAndVersionNumber(String requirementId, Integer versionNumber);

    boolean existsByProjectIdAndRequirementIdAndVersionNumber(String projectId, String requirementId, Integer versionNumber);

    long countByRequirementId(String requirementId);

    long countByProjectIdAndRequirementId(String projectId, String requirementId);

    void deleteByRequirementId(String requirementId);

    void deleteByProjectIdAndRequirementId(String projectId, String requirementId);
}
