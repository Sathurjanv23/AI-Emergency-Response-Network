package com.nova.emergency.repository;

import com.nova.emergency.model.TraceabilityArtifactType;
import com.nova.emergency.model.TraceabilityLink;
import com.nova.emergency.model.TraceabilityLinkStatus;
import com.nova.emergency.model.TraceabilityLinkType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data MongoDB repository for {@link TraceabilityLink} entities.
 * Supports strongly-typed, project-scoped queries for outgoing and incoming relationships,
 * relationship type filtering, logical relationship identity lookups, and pagination.
 */
@Repository
public interface TraceabilityLinkRepository extends MongoRepository<TraceabilityLink, String> {

    // =========================================================================
    // 4.1 Project-Scoped Link Lookup
    // =========================================================================

    Optional<TraceabilityLink> findByIdAndProjectId(String id, String projectId);

    List<TraceabilityLink> findByProjectId(String projectId);

    List<TraceabilityLink> findByProjectIdOrderByCreatedAtDesc(String projectId);

    Page<TraceabilityLink> findByProjectId(String projectId, Pageable pageable);

    List<TraceabilityLink> findByProjectIdAndStatus(String projectId, TraceabilityLinkStatus status);

    List<TraceabilityLink> findByProjectIdAndStatusOrderByCreatedAtDesc(String projectId, TraceabilityLinkStatus status);

    Page<TraceabilityLink> findByProjectIdAndStatus(String projectId, TraceabilityLinkStatus status, Pageable pageable);

    boolean existsByIdAndProjectId(String id, String projectId);

    long countByProjectId(String projectId);

    long countByProjectIdAndStatus(String projectId, TraceabilityLinkStatus status);

    void deleteByIdAndProjectId(String id, String projectId);

    // =========================================================================
    // 4.2 Outgoing Traceability Links (Originating from Source Artifact)
    // =========================================================================

    List<TraceabilityLink> findByProjectIdAndSourceArtifactTypeAndSourceArtifactId(
            String projectId, TraceabilityArtifactType sourceArtifactType, String sourceArtifactId);

    List<TraceabilityLink> findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdOrderByCreatedAtDesc(
            String projectId, TraceabilityArtifactType sourceArtifactType, String sourceArtifactId);

    Page<TraceabilityLink> findByProjectIdAndSourceArtifactTypeAndSourceArtifactId(
            String projectId, TraceabilityArtifactType sourceArtifactType, String sourceArtifactId, Pageable pageable);

    List<TraceabilityLink> findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndStatus(
            String projectId, TraceabilityArtifactType sourceArtifactType, String sourceArtifactId, TraceabilityLinkStatus status);

    List<TraceabilityLink> findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndStatusOrderByCreatedAtDesc(
            String projectId, TraceabilityArtifactType sourceArtifactType, String sourceArtifactId, TraceabilityLinkStatus status);

    Page<TraceabilityLink> findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndStatus(
            String projectId, TraceabilityArtifactType sourceArtifactType, String sourceArtifactId, TraceabilityLinkStatus status, Pageable pageable);

    long countByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndStatus(
            String projectId, TraceabilityArtifactType sourceArtifactType, String sourceArtifactId, TraceabilityLinkStatus status);

    // =========================================================================
    // 4.3 Incoming Traceability Links (Terminating at Target Artifact / Reverse)
    // =========================================================================

    List<TraceabilityLink> findByProjectIdAndTargetArtifactTypeAndTargetArtifactId(
            String projectId, TraceabilityArtifactType targetArtifactType, String targetArtifactId);

    List<TraceabilityLink> findByProjectIdAndTargetArtifactTypeAndTargetArtifactIdOrderByCreatedAtDesc(
            String projectId, TraceabilityArtifactType targetArtifactType, String targetArtifactId);

    Page<TraceabilityLink> findByProjectIdAndTargetArtifactTypeAndTargetArtifactId(
            String projectId, TraceabilityArtifactType targetArtifactType, String targetArtifactId, Pageable pageable);

    List<TraceabilityLink> findByProjectIdAndTargetArtifactTypeAndTargetArtifactIdAndStatus(
            String projectId, TraceabilityArtifactType targetArtifactType, String targetArtifactId, TraceabilityLinkStatus status);

    List<TraceabilityLink> findByProjectIdAndTargetArtifactTypeAndTargetArtifactIdAndStatusOrderByCreatedAtDesc(
            String projectId, TraceabilityArtifactType targetArtifactType, String targetArtifactId, TraceabilityLinkStatus status);

    Page<TraceabilityLink> findByProjectIdAndTargetArtifactTypeAndTargetArtifactIdAndStatus(
            String projectId, TraceabilityArtifactType targetArtifactType, String targetArtifactId, TraceabilityLinkStatus status, Pageable pageable);

    long countByProjectIdAndTargetArtifactTypeAndTargetArtifactIdAndStatus(
            String projectId, TraceabilityArtifactType targetArtifactType, String targetArtifactId, TraceabilityLinkStatus status);

    // =========================================================================
    // 4.4 Relationship Type Filtering
    // =========================================================================

    List<TraceabilityLink> findByProjectIdAndLinkType(
            String projectId, TraceabilityLinkType linkType);

    List<TraceabilityLink> findByProjectIdAndLinkTypeOrderByCreatedAtDesc(
            String projectId, TraceabilityLinkType linkType);

    Page<TraceabilityLink> findByProjectIdAndLinkType(
            String projectId, TraceabilityLinkType linkType, Pageable pageable);

    List<TraceabilityLink> findByProjectIdAndLinkTypeAndStatus(
            String projectId, TraceabilityLinkType linkType, TraceabilityLinkStatus status);

    List<TraceabilityLink> findByProjectIdAndLinkTypeAndStatusOrderByCreatedAtDesc(
            String projectId, TraceabilityLinkType linkType, TraceabilityLinkStatus status);

    Page<TraceabilityLink> findByProjectIdAndLinkTypeAndStatus(
            String projectId, TraceabilityLinkType linkType, TraceabilityLinkStatus status, Pageable pageable);

    long countByProjectIdAndLinkTypeAndStatus(
            String projectId, TraceabilityLinkType linkType, TraceabilityLinkStatus status);

    // =========================================================================
    // 4.5 Logical Relationship Identity Lookup (Excludes status)
    // =========================================================================

    /**
     * Finds a logical traceability relationship by its unique compound identity:
     * (projectId, sourceArtifactType, sourceArtifactId, targetArtifactType, targetArtifactId, linkType).
     * <p>
     * Does NOT include status in the query predicate, allowing retrieval of both ACTIVE
     * and INACTIVE documents for duplicate prevention and in-place reactivation.
     */
    Optional<TraceabilityLink> findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndTargetArtifactTypeAndTargetArtifactIdAndLinkType(
            String projectId,
            TraceabilityArtifactType sourceArtifactType,
            String sourceArtifactId,
            TraceabilityArtifactType targetArtifactType,
            String targetArtifactId,
            TraceabilityLinkType linkType);

    boolean existsByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndTargetArtifactTypeAndTargetArtifactIdAndLinkType(
            String projectId,
            TraceabilityArtifactType sourceArtifactType,
            String sourceArtifactId,
            TraceabilityArtifactType targetArtifactType,
            String targetArtifactId,
            TraceabilityLinkType linkType);
}
