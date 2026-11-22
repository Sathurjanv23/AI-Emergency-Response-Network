package com.nova.emergency.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nova.emergency.dto.CreateRequirementRequest;
import com.nova.emergency.dto.RequirementResponse;
import com.nova.emergency.dto.UpdateRequirementRequest;
import com.nova.emergency.dto.UpdateRequirementStatusRequest;
import com.nova.emergency.exception.InvalidStatusTransitionException;
import com.nova.emergency.exception.ResourceNotFoundException;
import com.nova.emergency.model.Requirement;
import com.nova.emergency.model.User;
import com.nova.emergency.repository.UserRepository;
import com.nova.emergency.security.JwtFilter;
import com.nova.emergency.service.RequirementService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {RequirementController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
class RequirementControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private RequirementService requirementService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtFilter jwtFilter;

    private User testUser;
    private Authentication testAuth;
    private RequirementResponse sampleResponse;
    private static final String BASE_URL = "/api/projects/proj-001/requirements";

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId("user-123");
        testUser.setEmail("janu@reqtrace.ai");
        testUser.setName("Janu");
        testUser.setRole("citizen");

        testAuth = new TestingAuthenticationToken("janu@reqtrace.ai", "password", "ROLE_CITIZEN");

        sampleResponse = RequirementResponse.builder()
                .id("req-001")
                .projectId("proj-001")
                .requirementKey("REQ-001")
                .title("User Authentication")
                .description("Users must log in with email and password.")
                .type("FUNCTIONAL")
                .priority("HIGH")
                .status("DRAFT")
                .currentVersionId("ver-001")
                .createdBy("user-123")
                .createdAt(Instant.now().toString())
                .updatedAt(Instant.now().toString())
                .build();

        when(userRepository.findByEmail("janu@reqtrace.ai")).thenReturn(Optional.of(testUser));
    }

    @Test
    @DisplayName("API Test 1: Create requirement returns 201 Created")
    void testCreateRequirementSuccess() throws Exception {
        CreateRequirementRequest req = CreateRequirementRequest.builder()
                .title("User Authentication")
                .description("Users must log in with email and password.")
                .type("FUNCTIONAL")
                .priority("HIGH")
                .build();

        when(requirementService.createRequirement(eq("proj-001"), any(CreateRequirementRequest.class), eq("user-123")))
                .thenReturn(sampleResponse);

        mockMvc.perform(post(BASE_URL)
                        .principal(testAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value("req-001"))
                .andExpect(jsonPath("$.data.requirementKey").value("REQ-001"))
                .andExpect(jsonPath("$.data.title").value("User Authentication"));
    }

    @Test
    @DisplayName("API Test 2: Invalid creation payload returns 400 Bad Request")
    void testCreateRequirementInvalidPayload() throws Exception {
        CreateRequirementRequest req = CreateRequirementRequest.builder()
                .title("")
                .description("")
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
    void testUnauthenticatedRequest() throws Exception {
        mockMvc.perform(get(BASE_URL))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API Test 4: Project access denial returns 403 Forbidden")
    void testProjectAccessDenial() throws Exception {
        when(requirementService.createRequirement(eq("proj-001"), any(CreateRequirementRequest.class), eq("user-123")))
                .thenThrow(new AccessDeniedException("Access denied. Insufficient privileges."));

        CreateRequirementRequest req = CreateRequirementRequest.builder()
                .title("Valid Title")
                .description("Valid Description")
                .build();

        mockMvc.perform(post(BASE_URL)
                        .principal(testAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API Test 5: List requirements returns 200 OK with pagination metadata")
    void testListRequirementsSuccess() throws Exception {
        when(requirementService.getRequirements(eq("proj-001"), any(), any(), any(), any(), any(), any(), eq("user-123")))
                .thenReturn(List.of(sampleResponse));
        when(requirementService.countRequirements(eq("proj-001"), any(), any(), any(), any(), eq("user-123")))
                .thenReturn(1L);

        mockMvc.perform(get(BASE_URL)
                        .principal(testAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value("req-001"))
                .andExpect(jsonPath("$.meta.total").value(1));
    }

    @Test
    @DisplayName("API Test 6: Cross-project access returns 404 Not Found")
    void testCrossProjectAccess() throws Exception {
        when(requirementService.getRequirement("proj-foreign", "req-001", "user-123"))
                .thenThrow(new ResourceNotFoundException("Requirement not found in project: proj-foreign"));

        mockMvc.perform(get("/api/projects/proj-foreign/requirements/req-001")
                        .principal(testAuth))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API Test 7: Get requirement details returns 200 OK")
    void testGetRequirementDetailsSuccess() throws Exception {
        when(requirementService.getRequirement("proj-001", "req-001", "user-123"))
                .thenReturn(sampleResponse);

        mockMvc.perform(get(BASE_URL + "/req-001")
                        .principal(testAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value("req-001"));
    }

    @Test
    @DisplayName("API Test 8: Missing requirement returns 404 Not Found")
    void testGetRequirementNotFound() throws Exception {
        when(requirementService.getRequirement("proj-001", "req-missing", "user-123"))
                .thenThrow(new ResourceNotFoundException("Requirement not found in project: proj-001"));

        mockMvc.perform(get(BASE_URL + "/req-missing")
                        .principal(testAuth))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API Test 9: Update requirement returns 200 OK")
    void testUpdateRequirementSuccess() throws Exception {
        UpdateRequirementRequest req = UpdateRequirementRequest.builder()
                .title("Updated Title")
                .description("Updated Description")
                .type("FUNCTIONAL")
                .priority("HIGH")
                .build();

        sampleResponse.setTitle("Updated Title");
        when(requirementService.updateRequirement(eq("proj-001"), eq("req-001"), any(UpdateRequirementRequest.class), eq("user-123")))
                .thenReturn(sampleResponse);

        mockMvc.perform(put(BASE_URL + "/req-001")
                        .principal(testAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.title").value("Updated Title"));
    }

    @Test
    @DisplayName("API Test 10: Update requirement status returns 200 OK")
    void testUpdateStatusSuccess() throws Exception {
        UpdateRequirementStatusRequest req = new UpdateRequirementStatusRequest("IN_REVIEW");
        sampleResponse.setStatus("IN_REVIEW");

        when(requirementService.updateStatus("proj-001", "req-001", "IN_REVIEW", "user-123"))
                .thenReturn(sampleResponse);

        mockMvc.perform(patch(BASE_URL + "/req-001/status")
                        .principal(testAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("IN_REVIEW"));
    }

    @Test
    @DisplayName("API Test 11: Invalid status transition returns 409 Conflict")
    void testInvalidStatusTransitionConflict() throws Exception {
        UpdateRequirementStatusRequest req = new UpdateRequirementStatusRequest("APPROVED");

        when(requirementService.updateStatus("proj-001", "req-001", "APPROVED", "user-123"))
                .thenThrow(new InvalidStatusTransitionException("Invalid requirement status transition from DRAFT to APPROVED."));

        mockMvc.perform(patch(BASE_URL + "/req-001/status")
                        .principal(testAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("INVALID_STATUS_TRANSITION"));
    }

    @Test
    @DisplayName("API Test 12: Delete requirement returns 200 OK")
    void testDeleteRequirementSuccess() throws Exception {
        sampleResponse.setStatus("DEPRECATED");
        when(requirementService.deleteRequirement("proj-001", "req-001", "user-123"))
                .thenReturn(sampleResponse);

        mockMvc.perform(delete(BASE_URL + "/req-001")
                        .principal(testAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("DEPRECATED"));
    }
}
