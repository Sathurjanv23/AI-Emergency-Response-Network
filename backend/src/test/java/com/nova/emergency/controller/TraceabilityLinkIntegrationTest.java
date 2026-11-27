package com.nova.emergency.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nova.emergency.dto.CreateTraceabilityLinkRequest;
import com.nova.emergency.dto.UpdateTraceabilityLinkRequest;
import com.nova.emergency.model.*;
import com.nova.emergency.repository.ProjectRepository;
import com.nova.emergency.repository.RequirementRepository;
import com.nova.emergency.repository.TraceabilityLinkRepository;
import com.nova.emergency.repository.UserRepository;
import com.nova.emergency.security.JwtFilter;
import com.nova.emergency.service.TraceabilityLinkServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-End API Integration & Security Hardening Tests for Traceability Management.
 * Integrates {@link TraceabilityLinkController}, real {@link TraceabilityLinkServiceImpl},
 * and {@link GlobalExceptionHandler} with mocked database repositories.
 * Verifies full 10-step lifecycles, project isolation, security authentication/authorization,
 * cycle detection, error contracts, and pagination constraints.
 */
@WebMvcTest(controllers = {TraceabilityLinkController.class, GlobalExceptionHandler.class})
@Import(TraceabilityLinkServiceImpl.class)
@AutoConfigureMockMvc(addFilters = false)
class TraceabilityLinkIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TraceabilityLinkRepository traceabilityLinkRepository;

    @MockBean
    private RequirementRepository requirementRepository;

    @MockBean
    private ProjectRepository projectRepository;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtFilter jwtFilter;

    private User ownerUser;
    private User intruderUser;
    private Authentication ownerAuth;
    private Authentication intruderAuth;
    private Project testProject;
    private Requirement reqA;
    private Requirement reqB;
    private TraceabilityLink activeLink;

    private static final String PROJECT_ID = "proj-100";
    private static final String BASE_URL = "/api/projects/" + PROJECT_ID + "/traceability-links";

    @BeforeEach
    void setUp() {
        ownerUser = new User();
        ownerUser.setId("user-owner");
        ownerUser.setEmail("owner@reqtrace.ai");
        ownerUser.setName("Project Owner");
        ownerUser.setRole("citizen");

        intruderUser = new User();
        intruderUser.setId("user-intruder");
        intruderUser.setEmail("intruder@reqtrace.ai");
        intruderUser.setName("Unauthorized Intruder");
        intruderUser.setRole("citizen");

        ownerAuth = new TestingAuthenticationToken(ownerUser.getEmail(), "password", "ROLE_CITIZEN");
        intruderAuth = new TestingAuthenticationToken(intruderUser.getEmail(), "password", "ROLE_CITIZEN");

        testProject = new Project();
        testProject.setId(PROJECT_ID);
        testProject.setName("Emergency Dispatch AI");
        testProject.setOwnerId("user-owner");

        reqA = new Requirement();
        reqA.setId("req-001");
        reqA.setProjectId(PROJECT_ID);
        reqA.setTitle("Incident Ingestion");

        reqB = new Requirement();
        reqB.setId("req-002");
        reqB.setProjectId(PROJECT_ID);
        reqB.setTitle("Rescue Unit Dispatch");

        String now = Instant.now().toString();
        activeLink = TraceabilityLink.builder()
                .id("link-001")
                .projectId(PROJECT_ID)
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-001")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-002")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .status(TraceabilityLinkStatus.ACTIVE)
                .description("Dispatch depends on incident ingestion")
                .createdBy("user-owner")
                .createdAt(now)
                .updatedAt(now)
                .build();

        // Default mock behaviors for owner and project
        when(userRepository.findByEmail(ownerUser.getEmail())).thenReturn(Optional.of(ownerUser));
        when(userRepository.findByEmail(intruderUser.getEmail())).thenReturn(Optional.of(intruderUser));
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(testProject));
        when(requirementRepository.findByIdAndProjectId("req-001", PROJECT_ID)).thenReturn(Optional.of(reqA));
        when(requirementRepository.findByIdAndProjectId("req-002", PROJECT_ID)).thenReturn(Optional.of(reqB));
    }

    // =========================================================================
    // 1. Full 10-Step Lifecycle Integration Flow
    // =========================================================================

    @Test
    @DisplayName("Lifecycle Step 1: Create requirement-to-requirement link returns 201 Created")
    void testLifecycle1_CreateLink() throws Exception {
        CreateTraceabilityLinkRequest req = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-001")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-002")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .description("Dispatch depends on incident ingestion")
                .build();

        when(traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndTargetArtifactTypeAndTargetArtifactIdAndLinkType(
                PROJECT_ID, TraceabilityArtifactType.REQUIREMENT, "req-001", TraceabilityArtifactType.REQUIREMENT, "req-002", TraceabilityLinkType.DEPENDS_ON))
                .thenReturn(Optional.empty());

        when(traceabilityLinkRepository.save(any(TraceabilityLink.class))).thenReturn(activeLink);

        mockMvc.perform(post(BASE_URL)
                        .principal(ownerAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value("link-001"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.sourceArtifactId").value("req-001"))
                .andExpect(jsonPath("$.data.targetArtifactId").value("req-002"));
    }

    @Test
    @DisplayName("Lifecycle Step 2: Retrieve created link by ID returns 200 OK")
    void testLifecycle2_GetLinkById() throws Exception {
        when(traceabilityLinkRepository.findByIdAndProjectId("link-001", PROJECT_ID))
                .thenReturn(Optional.of(activeLink));

        mockMvc.perform(get(BASE_URL + "/link-001")
                        .principal(ownerAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value("link-001"))
                .andExpect(jsonPath("$.data.projectId").value(PROJECT_ID));
    }

    @Test
    @DisplayName("Lifecycle Step 3: List and filter links returns 200 OK with pagination metadata")
    void testLifecycle3_ListLinksWithFilter() throws Exception {
        when(traceabilityLinkRepository.findByProjectIdAndStatus(eq(PROJECT_ID), eq(TraceabilityLinkStatus.ACTIVE), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(activeLink)));

        mockMvc.perform(get(BASE_URL)
                        .param("status", "ACTIVE")
                        .param("page", "0")
                        .param("pageSize", "10")
                        .principal(ownerAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value("link-001"))
                .andExpect(jsonPath("$.meta.total").value(1))
                .andExpect(jsonPath("$.meta.page").value(0))
                .andExpect(jsonPath("$.meta.pageSize").value(10));
    }

    @Test
    @DisplayName("Lifecycle Step 4: Retrieve incoming and outgoing relationships returns 200 OK")
    void testLifecycle4_OutgoingAndIncomingLinks() throws Exception {
        when(traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdOrderByCreatedAtDesc(
                PROJECT_ID, TraceabilityArtifactType.REQUIREMENT, "req-001"))
                .thenReturn(List.of(activeLink));

        mockMvc.perform(get(BASE_URL + "/outgoing")
                        .param("sourceArtifactType", "REQUIREMENT")
                        .param("sourceArtifactId", "req-001")
                        .principal(ownerAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].sourceArtifactId").value("req-001"));

        when(traceabilityLinkRepository.findByProjectIdAndTargetArtifactTypeAndTargetArtifactIdOrderByCreatedAtDesc(
                PROJECT_ID, TraceabilityArtifactType.REQUIREMENT, "req-002"))
                .thenReturn(List.of(activeLink));

        mockMvc.perform(get(BASE_URL + "/incoming")
                        .param("targetArtifactType", "REQUIREMENT")
                        .param("targetArtifactId", "req-002")
                        .principal(ownerAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].targetArtifactId").value("req-002"));
    }

    @Test
    @DisplayName("Lifecycle Step 5: Update link description returns 200 OK preserving immutable fields")
    void testLifecycle5_UpdateDescription() throws Exception {
        when(traceabilityLinkRepository.findByIdAndProjectId("link-001", PROJECT_ID))
                .thenReturn(Optional.of(activeLink));

        when(traceabilityLinkRepository.save(any(TraceabilityLink.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        UpdateTraceabilityLinkRequest updateReq = UpdateTraceabilityLinkRequest.builder()
                .description("Updated architecture rationale")
                .build();

        mockMvc.perform(patch(BASE_URL + "/link-001")
                        .principal(ownerAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.description").value("Updated architecture rationale"))
                .andExpect(jsonPath("$.data.sourceArtifactId").value("req-001"))
                .andExpect(jsonPath("$.data.targetArtifactId").value("req-002"));
    }

    @Test
    @DisplayName("Lifecycle Step 6: Deactivate link soft deletes and transitions to INACTIVE")
    void testLifecycle6_DeactivateLink() throws Exception {
        when(traceabilityLinkRepository.findByIdAndProjectId("link-001", PROJECT_ID))
                .thenReturn(Optional.of(activeLink));

        when(traceabilityLinkRepository.save(any(TraceabilityLink.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(patch(BASE_URL + "/link-001/deactivate")
                        .principal(ownerAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("INACTIVE"));
    }

    @Test
    @DisplayName("Lifecycle Step 7: Reactivate link transitions back to ACTIVE in-place")
    void testLifecycle7_ReactivateLink() throws Exception {
        TraceabilityLink inactive = TraceabilityLink.builder()
                .id("link-001")
                .projectId(PROJECT_ID)
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-001")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-002")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .status(TraceabilityLinkStatus.INACTIVE)
                .createdBy("user-owner")
                .createdAt(Instant.now().toString())
                .updatedAt(Instant.now().toString())
                .build();

        when(traceabilityLinkRepository.findByIdAndProjectId("link-001", PROJECT_ID))
                .thenReturn(Optional.of(inactive));

        when(traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndStatus(
                eq(PROJECT_ID), eq(TraceabilityArtifactType.REQUIREMENT), eq("req-002"), eq(TraceabilityLinkStatus.ACTIVE)))
                .thenReturn(Collections.emptyList());

        when(traceabilityLinkRepository.save(any(TraceabilityLink.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(patch(BASE_URL + "/link-001/reactivate")
                        .principal(ownerAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.id").value("link-001"));
    }

    @Test
    @DisplayName("Lifecycle Step 8: Duplicate active link creation returns 409 Conflict")
    void testLifecycle8_DuplicateActiveLinkCreation() throws Exception {
        CreateTraceabilityLinkRequest req = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-001")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-002")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        when(traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndTargetArtifactTypeAndTargetArtifactIdAndLinkType(
                PROJECT_ID, TraceabilityArtifactType.REQUIREMENT, "req-001", TraceabilityArtifactType.REQUIREMENT, "req-002", TraceabilityLinkType.DEPENDS_ON))
                .thenReturn(Optional.of(activeLink));

        mockMvc.perform(post(BASE_URL)
                        .principal(ownerAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Lifecycle Step 9: Circular dependency creation returns 409 Conflict")
    void testLifecycle9_CircularDependencyRejection() throws Exception {
        CreateTraceabilityLinkRequest req = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-002")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-001")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        when(traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndTargetArtifactTypeAndTargetArtifactIdAndLinkType(
                PROJECT_ID, TraceabilityArtifactType.REQUIREMENT, "req-002", TraceabilityArtifactType.REQUIREMENT, "req-001", TraceabilityLinkType.DEPENDS_ON))
                .thenReturn(Optional.empty());

        // When checking cycle from target (req-001), activeLink has outgoing edge req-001 -> req-002
        when(traceabilityLinkRepository.findByProjectIdAndSourceArtifactTypeAndSourceArtifactIdAndStatus(
                PROJECT_ID, TraceabilityArtifactType.REQUIREMENT, "req-001", TraceabilityLinkStatus.ACTIVE))
                .thenReturn(List.of(activeLink));

        mockMvc.perform(post(BASE_URL)
                        .principal(ownerAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Lifecycle Step 10: Authorized permanent delete returns 200 OK")
    void testLifecycle10_DeleteLink() throws Exception {
        when(traceabilityLinkRepository.findByIdAndProjectId("link-001", PROJECT_ID))
                .thenReturn(Optional.of(activeLink));

        mockMvc.perform(delete(BASE_URL + "/link-001")
                        .principal(ownerAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Traceability link deleted successfully"));

        verify(traceabilityLinkRepository, times(1)).deleteByIdAndProjectId("link-001", PROJECT_ID);
    }

    // =========================================================================
    // 2. Security Hardening & Edge Cases
    // =========================================================================

    @Test
    @DisplayName("Security 1: Missing authentication principal returns 401 Unauthorized")
    void testSecurity_UnauthenticatedReturns401() throws Exception {
        mockMvc.perform(get(BASE_URL))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Security 2: Anonymous user principal returns 401 Unauthorized")
    void testSecurity_AnonymousUserReturns401() throws Exception {
        mockMvc.perform(get(BASE_URL)
                        .principal(new TestingAuthenticationToken("anonymousUser", null)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Security 3: Authenticated user missing from database returns 403 Forbidden")
    void testSecurity_MissingUserReturns403() throws Exception {
        Authentication ghostAuth = new TestingAuthenticationToken("ghost@reqtrace.ai", "password", "ROLE_CITIZEN");
        when(userRepository.findByEmail("ghost@reqtrace.ai")).thenReturn(Optional.empty());

        mockMvc.perform(get(BASE_URL)
                        .principal(ghostAuth))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Security 4: Cross-project access by non-owner returns 403 Forbidden")
    void testSecurity_CrossProjectAccessReturns403() throws Exception {
        mockMvc.perform(get(BASE_URL)
                        .principal(intruderAuth))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Security 5: Non-existent project returns 404 Not Found")
    void testSecurity_MissingProjectReturns404() throws Exception {
        when(projectRepository.findById("proj-missing")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/projects/proj-missing/traceability-links")
                        .principal(ownerAuth))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Security 6: Missing requirement artifact returns 404 Not Found")
    void testSecurity_MissingRequirementReturns404() throws Exception {
        CreateTraceabilityLinkRequest req = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-nonexistent")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-002")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        when(requirementRepository.findByIdAndProjectId("req-nonexistent", PROJECT_ID)).thenReturn(Optional.empty());

        mockMvc.perform(post(BASE_URL)
                        .principal(ownerAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Security 7: Self-referencing link returns 400 Bad Request")
    void testSecurity_SelfLinkReturns400() throws Exception {
        CreateTraceabilityLinkRequest req = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-001")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-001")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        mockMvc.perform(post(BASE_URL)
                        .principal(ownerAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Security 8: Invalid artifact combination returns 400 Bad Request")
    void testSecurity_InvalidArtifactCombinationReturns400() throws Exception {
        CreateTraceabilityLinkRequest req = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-001")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-002")
                .linkType(TraceabilityLinkType.VERIFIED_BY) // VERIFIED_BY requires target TEST_CASE
                .build();

        mockMvc.perform(post(BASE_URL)
                        .principal(ownerAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Security 9: Malformed JSON body returns 400 Bad Request")
    void testSecurity_MalformedJsonReturns400() throws Exception {
        mockMvc.perform(post(BASE_URL)
                        .principal(ownerAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"sourceArtifactId\": "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Security 10: Invalid enum query parameter returns 400 Bad Request")
    void testSecurity_InvalidEnumQueryParamReturns400() throws Exception {
        mockMvc.perform(get(BASE_URL)
                        .param("status", "INVALID_STATUS_VALUE")
                        .principal(ownerAuth))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Security 11: Oversized page size is safely capped to 100")
    void testSecurity_PageSizeCappedAt100() throws Exception {
        when(traceabilityLinkRepository.findByProjectId(eq(PROJECT_ID), any(Pageable.class)))
                .thenAnswer(invocation -> {
                    Pageable pageable = invocation.getArgument(1);
                    assertThat(pageable.getPageSize()).isEqualTo(100);
                    return new PageImpl<>(List.of(activeLink), pageable, 1);
                });

        mockMvc.perform(get(BASE_URL)
                        .param("page", "0")
                        .param("pageSize", "5000")
                        .principal(ownerAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.meta.pageSize").value(100));
    }
}
