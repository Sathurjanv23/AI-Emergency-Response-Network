package com.nova.emergency.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nova.emergency.dto.CreateTraceabilityLinkRequest;
import com.nova.emergency.dto.TraceabilityLinkResponse;
import com.nova.emergency.dto.UpdateTraceabilityLinkRequest;
import com.nova.emergency.exception.ResourceNotFoundException;
import com.nova.emergency.model.TraceabilityArtifactType;
import com.nova.emergency.model.TraceabilityLinkStatus;
import com.nova.emergency.model.TraceabilityLinkType;
import com.nova.emergency.model.User;
import com.nova.emergency.repository.UserRepository;
import com.nova.emergency.security.JwtFilter;
import com.nova.emergency.service.TraceabilityLinkService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {TraceabilityLinkController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
class TraceabilityLinkControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TraceabilityLinkService traceabilityLinkService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtFilter jwtFilter;

    private User testUser;
    private Authentication testAuth;
    private TraceabilityLinkResponse sampleResponse;
    private static final String BASE_URL = "/api/projects/proj-001/traceability-links";

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId("user-123");
        testUser.setEmail("janu@reqtrace.ai");
        testUser.setName("Janu");
        testUser.setRole("citizen");

        testAuth = new TestingAuthenticationToken("janu@reqtrace.ai", "password", "ROLE_CITIZEN");

        sampleResponse = TraceabilityLinkResponse.builder()
                .id("link-001")
                .projectId("proj-001")
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-001")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-002")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .status(TraceabilityLinkStatus.ACTIVE)
                .description("req-001 depends on core auth in req-002")
                .createdBy("user-123")
                .createdAt(Instant.now().toString())
                .updatedAt(Instant.now().toString())
                .build();

        when(userRepository.findByEmail("janu@reqtrace.ai")).thenReturn(Optional.of(testUser));
    }

    // =========================================================================
    // 1. Link Creation Endpoints
    // =========================================================================

    @Test
    @DisplayName("API Test 1: Create traceability link returns 201 Created")
    void testCreateLinkSuccess() throws Exception {
        CreateTraceabilityLinkRequest req = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-001")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-002")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .description("req-001 depends on core auth in req-002")
                .build();

        when(traceabilityLinkService.createLink(eq("proj-001"), any(CreateTraceabilityLinkRequest.class), eq("user-123")))
                .thenReturn(sampleResponse);

        mockMvc.perform(post(BASE_URL)
                        .principal(testAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value("link-001"))
                .andExpect(jsonPath("$.data.sourceArtifactId").value("req-001"))
                .andExpect(jsonPath("$.data.targetArtifactId").value("req-002"))
                .andExpect(jsonPath("$.data.linkType").value("DEPENDS_ON"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    @DisplayName("API Test 2: Invalid creation payload returns 400 Bad Request")
    void testCreateLinkInvalidPayload() throws Exception {
        CreateTraceabilityLinkRequest req = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(null) // missing required source type
                .sourceArtifactId("")     // blank ID
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-002")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        mockMvc.perform(post(BASE_URL)
                        .principal(testAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API Test 3: Unauthenticated request returns 401 Unauthorized")
    void testCreateLinkUnauthenticated() throws Exception {
        CreateTraceabilityLinkRequest req = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-001")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-002")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API Test 4: Unauthorized project access returns 403 Forbidden")
    void testCreateLinkUnauthorized() throws Exception {
        CreateTraceabilityLinkRequest req = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-001")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-002")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        when(traceabilityLinkService.createLink(eq("proj-001"), any(CreateTraceabilityLinkRequest.class), eq("user-123")))
                .thenThrow(new AccessDeniedException("Access denied. Insufficient privileges."));

        mockMvc.perform(post(BASE_URL)
                        .principal(testAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API Test 5: Missing project returns 404 Not Found")
    void testCreateLinkProjectNotFound() throws Exception {
        CreateTraceabilityLinkRequest req = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-001")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-002")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        when(traceabilityLinkService.createLink(eq("proj-missing"), any(CreateTraceabilityLinkRequest.class), eq("user-123")))
                .thenThrow(new ResourceNotFoundException("Project not found with id: proj-missing"));

        mockMvc.perform(post("/api/projects/proj-missing/traceability-links")
                        .principal(testAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API Test 6: Missing artifact returns 404 Not Found")
    void testCreateLinkArtifactNotFound() throws Exception {
        CreateTraceabilityLinkRequest req = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-missing")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-002")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        when(traceabilityLinkService.createLink(eq("proj-001"), any(CreateTraceabilityLinkRequest.class), eq("user-123")))
                .thenThrow(new ResourceNotFoundException("Requirement not found with id req-missing in project proj-001"));

        mockMvc.perform(post(BASE_URL)
                        .principal(testAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API Test 7: Self-link rejection returns 400 Bad Request")
    void testCreateLinkSelfLinkRejected() throws Exception {
        CreateTraceabilityLinkRequest req = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-001")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-001")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        when(traceabilityLinkService.createLink(eq("proj-001"), any(CreateTraceabilityLinkRequest.class), eq("user-123")))
                .thenThrow(new IllegalArgumentException("Cannot create a self-referencing traceability link: source and target artifacts must be different."));

        mockMvc.perform(post(BASE_URL)
                        .principal(testAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API Test 8: Duplicate active relationship returns 409 Conflict")
    void testCreateLinkDuplicateActiveConflict() throws Exception {
        CreateTraceabilityLinkRequest req = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-001")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-002")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        when(traceabilityLinkService.createLink(eq("proj-001"), any(CreateTraceabilityLinkRequest.class), eq("user-123")))
                .thenThrow(new IllegalStateException("An active traceability link already exists for this logical relationship."));

        mockMvc.perform(post(BASE_URL)
                        .principal(testAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API Test 9: Circular dependency rejection returns 409 Conflict")
    void testCreateLinkCircularDependencyConflict() throws Exception {
        CreateTraceabilityLinkRequest req = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-002")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-001")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        when(traceabilityLinkService.createLink(eq("proj-001"), any(CreateTraceabilityLinkRequest.class), eq("user-123")))
                .thenThrow(new IllegalStateException("Circular dependency detected: Adding a DEPENDS_ON link from 'req-002' to 'req-001' would create a cycle."));

        mockMvc.perform(post(BASE_URL)
                        .principal(testAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API Test 10: Inactive link reactivation via create returns 201 Created with ACTIVE status")
    void testCreateLinkReactivationSuccess() throws Exception {
        CreateTraceabilityLinkRequest req = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-001")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-002")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .description("Reactivated relationship")
                .build();

        sampleResponse.setDescription("Reactivated relationship");
        when(traceabilityLinkService.createLink(eq("proj-001"), any(CreateTraceabilityLinkRequest.class), eq("user-123")))
                .thenReturn(sampleResponse);

        mockMvc.perform(post(BASE_URL)
                        .principal(testAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.description").value("Reactivated relationship"));
    }

    // =========================================================================
    // 2. Query Endpoints (List, Outgoing, Incoming, By-Type)
    // =========================================================================

    @Test
    @DisplayName("API Test 11: List project links unpaginated returns 200 OK")
    void testListLinksUnpaginated() throws Exception {
        when(traceabilityLinkService.getLinksByProject(eq("proj-001"), isNull(), eq("user-123")))
                .thenReturn(List.of(sampleResponse));

        mockMvc.perform(get(BASE_URL)
                        .principal(testAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value("link-001"))
                .andExpect(jsonPath("$.meta.total").value(1));
    }

    @Test
    @DisplayName("API Test 12: List project links paginated with status filter returns 200 OK")
    void testListLinksPaginatedWithStatus() throws Exception {
        when(traceabilityLinkService.getLinksByProject(eq("proj-001"), eq(TraceabilityLinkStatus.ACTIVE), any(Pageable.class), eq("user-123")))
                .thenReturn(new PageImpl<>(List.of(sampleResponse)));

        mockMvc.perform(get(BASE_URL)
                        .param("status", "ACTIVE")
                        .param("page", "0")
                        .param("pageSize", "10")
                        .principal(testAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value("link-001"))
                .andExpect(jsonPath("$.meta.total").value(1))
                .andExpect(jsonPath("$.meta.page").value(0))
                .andExpect(jsonPath("$.meta.pageSize").value(10));
    }

    @Test
    @DisplayName("API Test 13: Query outgoing links returns 200 OK")
    void testGetOutgoingLinksSuccess() throws Exception {
        when(traceabilityLinkService.getOutgoingLinks(eq("proj-001"), eq(TraceabilityArtifactType.REQUIREMENT), eq("req-001"), isNull(), eq("user-123")))
                .thenReturn(List.of(sampleResponse));

        mockMvc.perform(get(BASE_URL + "/outgoing")
                        .param("sourceArtifactType", "REQUIREMENT")
                        .param("sourceArtifactId", "req-001")
                        .principal(testAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].sourceArtifactId").value("req-001"));
    }

    @Test
    @DisplayName("API Test 14: Query outgoing links missing required param returns 400 Bad Request")
    void testGetOutgoingLinksMissingParam() throws Exception {
        mockMvc.perform(get(BASE_URL + "/outgoing")
                        .param("sourceArtifactId", "req-001")
                        .principal(testAuth))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API Test 15: Query incoming links returns 200 OK")
    void testGetIncomingLinksSuccess() throws Exception {
        when(traceabilityLinkService.getIncomingLinks(eq("proj-001"), eq(TraceabilityArtifactType.REQUIREMENT), eq("req-002"), isNull(), eq("user-123")))
                .thenReturn(List.of(sampleResponse));

        mockMvc.perform(get(BASE_URL + "/incoming")
                        .param("targetArtifactType", "REQUIREMENT")
                        .param("targetArtifactId", "req-002")
                        .principal(testAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].targetArtifactId").value("req-002"));
    }

    @Test
    @DisplayName("API Test 16: Query incoming links missing required param returns 400 Bad Request")
    void testGetIncomingLinksMissingParam() throws Exception {
        mockMvc.perform(get(BASE_URL + "/incoming")
                        .param("targetArtifactType", "REQUIREMENT")
                        .principal(testAuth))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API Test 17: Query links by type returns 200 OK")
    void testGetLinksByTypeSuccess() throws Exception {
        when(traceabilityLinkService.getLinksByType(eq("proj-001"), eq(TraceabilityLinkType.DEPENDS_ON), isNull(), eq("user-123")))
                .thenReturn(List.of(sampleResponse));

        mockMvc.perform(get(BASE_URL + "/by-type")
                        .param("linkType", "DEPENDS_ON")
                        .principal(testAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].linkType").value("DEPENDS_ON"));
    }

    // =========================================================================
    // 3. Single Resource, Update, Lifecycle & Delete Endpoints
    // =========================================================================

    @Test
    @DisplayName("API Test 18: Get single link details returns 200 OK")
    void testGetLinkByIdSuccess() throws Exception {
        when(traceabilityLinkService.getLinkById("proj-001", "link-001", "user-123"))
                .thenReturn(sampleResponse);

        mockMvc.perform(get(BASE_URL + "/link-001")
                        .principal(testAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value("link-001"));
    }

    @Test
    @DisplayName("API Test 19: Get single link not found returns 404 Not Found")
    void testGetLinkByIdNotFound() throws Exception {
        when(traceabilityLinkService.getLinkById("proj-001", "link-missing", "user-123"))
                .thenThrow(new ResourceNotFoundException("Traceability link not found with ID link-missing in project proj-001"));

        mockMvc.perform(get(BASE_URL + "/link-missing")
                        .principal(testAuth))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API Test 20: Cross-project link access returns 404 Not Found (Project Isolation)")
    void testGetLinkCrossProjectNotFound() throws Exception {
        when(traceabilityLinkService.getLinkById("proj-foreign", "link-001", "user-123"))
                .thenThrow(new ResourceNotFoundException("Traceability link not found with ID link-001 in project proj-foreign"));

        mockMvc.perform(get("/api/projects/proj-foreign/traceability-links/link-001")
                        .principal(testAuth))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API Test 21: Update link description returns 200 OK")
    void testUpdateLinkSuccess() throws Exception {
        UpdateTraceabilityLinkRequest req = UpdateTraceabilityLinkRequest.builder()
                .description("Updated architecture context")
                .build();

        sampleResponse.setDescription("Updated architecture context");
        when(traceabilityLinkService.updateLink(eq("proj-001"), eq("link-001"), any(UpdateTraceabilityLinkRequest.class), eq("user-123")))
                .thenReturn(sampleResponse);

        mockMvc.perform(patch(BASE_URL + "/link-001")
                        .principal(testAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.description").value("Updated architecture context"));
    }

    @Test
    @DisplayName("API Test 22: Update link invalid description length returns 400 Bad Request")
    void testUpdateLinkInvalidLength() throws Exception {
        UpdateTraceabilityLinkRequest req = UpdateTraceabilityLinkRequest.builder()
                .description("A".repeat(1001))
                .build();

        mockMvc.perform(patch(BASE_URL + "/link-001")
                        .principal(testAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API Test 23: Deactivate link returns 200 OK with INACTIVE status")
    void testDeactivateLinkSuccess() throws Exception {
        sampleResponse.setStatus(TraceabilityLinkStatus.INACTIVE);
        when(traceabilityLinkService.deactivateLink("proj-001", "link-001", "user-123"))
                .thenReturn(sampleResponse);

        mockMvc.perform(patch(BASE_URL + "/link-001/deactivate")
                        .principal(testAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("INACTIVE"));
    }

    @Test
    @DisplayName("API Test 24: Reactivate link returns 200 OK with ACTIVE status")
    void testReactivateLinkSuccess() throws Exception {
        sampleResponse.setStatus(TraceabilityLinkStatus.ACTIVE);
        when(traceabilityLinkService.reactivateLink("proj-001", "link-001", "user-123"))
                .thenReturn(sampleResponse);

        mockMvc.perform(patch(BASE_URL + "/link-001/reactivate")
                        .principal(testAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    @DisplayName("API Test 25: Reactivate link circular dependency returns 409 Conflict")
    void testReactivateLinkCircularDependencyConflict() throws Exception {
        when(traceabilityLinkService.reactivateLink("proj-001", "link-001", "user-123"))
                .thenThrow(new IllegalStateException("Circular dependency detected: Cannot reactivate link."));

        mockMvc.perform(patch(BASE_URL + "/link-001/reactivate")
                        .principal(testAuth))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API Test 26: Delete link returns 200 OK")
    void testDeleteLinkSuccess() throws Exception {
        doNothing().when(traceabilityLinkService).deleteLink("proj-001", "link-001", "user-123");

        mockMvc.perform(delete(BASE_URL + "/link-001")
                        .principal(testAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Traceability link deleted successfully"));
    }

    @Test
    @DisplayName("API Test 27: Delete missing link returns 404 Not Found")
    void testDeleteLinkNotFound() throws Exception {
        doThrow(new ResourceNotFoundException("Traceability link not found with ID link-missing in project proj-001"))
                .when(traceabilityLinkService).deleteLink("proj-001", "link-missing", "user-123");

        mockMvc.perform(delete(BASE_URL + "/link-missing")
                        .principal(testAuth))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API Test 28: Delete link unauthorized returns 403 Forbidden")
    void testDeleteLinkUnauthorized() throws Exception {
        doThrow(new AccessDeniedException("Access denied. Insufficient privileges."))
                .when(traceabilityLinkService).deleteLink("proj-001", "link-001", "user-123");

        mockMvc.perform(delete(BASE_URL + "/link-001")
                        .principal(testAuth))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }
}
