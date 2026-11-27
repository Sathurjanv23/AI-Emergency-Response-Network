package com.nova.emergency.service;

import com.nova.emergency.dto.CreateTraceabilityLinkRequest;
import com.nova.emergency.dto.TraceabilityLinkResponse;
import com.nova.emergency.dto.UpdateTraceabilityLinkRequest;
import com.nova.emergency.model.TraceabilityArtifactType;
import com.nova.emergency.model.TraceabilityLinkStatus;
import com.nova.emergency.model.TraceabilityLinkType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * Service interface for managing traceability links between software engineering artifacts.
 * Provides project-scoped creation, retrieval, filtering, updating, soft deletion (deactivation),
 * and reactivation with business rule validation and circular dependency prevention.
 */
public interface TraceabilityLinkService {

    /**
     * Creates a new traceability link within a project.
     * If an INACTIVE link already exists for the same logical relationship, it is reactivated.
     * If an ACTIVE link already exists, duplicate creation is rejected.
     */
    TraceabilityLinkResponse createLink(String projectId, CreateTraceabilityLinkRequest request, String authenticatedUserId);

    /**
     * Retrieves a single traceability link by its ID and project ID.
     */
    TraceabilityLinkResponse getLinkById(String projectId, String linkId, String authenticatedUserId);

    /**
     * Retrieves a paginated list of traceability links for a project, optionally filtered by status.
     */
    Page<TraceabilityLinkResponse> getLinksByProject(String projectId, TraceabilityLinkStatus status, Pageable pageable, String authenticatedUserId);

    /**
     * Retrieves all traceability links for a project, optionally filtered by status.
     */
    List<TraceabilityLinkResponse> getLinksByProject(String projectId, TraceabilityLinkStatus status, String authenticatedUserId);

    /**
     * Retrieves paginated outgoing traceability links originating from a source artifact.
     */
    Page<TraceabilityLinkResponse> getOutgoingLinks(String projectId, TraceabilityArtifactType sourceArtifactType, String sourceArtifactId, TraceabilityLinkStatus status, Pageable pageable, String authenticatedUserId);

    /**
     * Retrieves all outgoing traceability links originating from a source artifact.
     */
    List<TraceabilityLinkResponse> getOutgoingLinks(String projectId, TraceabilityArtifactType sourceArtifactType, String sourceArtifactId, TraceabilityLinkStatus status, String authenticatedUserId);

    /**
     * Retrieves paginated incoming traceability links terminating at a target artifact.
     */
    Page<TraceabilityLinkResponse> getIncomingLinks(String projectId, TraceabilityArtifactType targetArtifactType, String targetArtifactId, TraceabilityLinkStatus status, Pageable pageable, String authenticatedUserId);

    /**
     * Retrieves all incoming traceability links terminating at a target artifact.
     */
    List<TraceabilityLinkResponse> getIncomingLinks(String projectId, TraceabilityArtifactType targetArtifactType, String targetArtifactId, TraceabilityLinkStatus status, String authenticatedUserId);

    /**
     * Retrieves paginated traceability links filtered by relationship type and optional status.
     */
    Page<TraceabilityLinkResponse> getLinksByType(String projectId, TraceabilityLinkType linkType, TraceabilityLinkStatus status, Pageable pageable, String authenticatedUserId);

    /**
     * Retrieves all traceability links filtered by relationship type and optional status.
     */
    List<TraceabilityLinkResponse> getLinksByType(String projectId, TraceabilityLinkType linkType, TraceabilityLinkStatus status, String authenticatedUserId);

    /**
     * Updates an existing traceability link description. Immutable identity fields cannot be altered.
     */
    TraceabilityLinkResponse updateLink(String projectId, String linkId, UpdateTraceabilityLinkRequest request, String authenticatedUserId);

    /**
     * Soft-deactivates an existing traceability link (sets status to INACTIVE).
     */
    TraceabilityLinkResponse deactivateLink(String projectId, String linkId, String authenticatedUserId);

    /**
     * Reactivates an existing INACTIVE traceability link (sets status to ACTIVE).
     */
    TraceabilityLinkResponse reactivateLink(String projectId, String linkId, String authenticatedUserId);

    /**
     * Permanently deletes a traceability link from a project.
     */
    void deleteLink(String projectId, String linkId, String authenticatedUserId);
}
