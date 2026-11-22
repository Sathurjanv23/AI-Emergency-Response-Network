package com.nova.emergency.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nova.emergency.dto.*;
import com.nova.emergency.exception.InvalidStatusTransitionException;
import com.nova.emergency.exception.ResourceNotFoundException;
import com.nova.emergency.model.ChangeType;
import com.nova.emergency.model.ReviewStatus;
import com.nova.emergency.model.User;
import com.nova.emergency.repository.UserRepository;
import com.nova.emergency.security.JwtFilter;
import com.nova.emergency.service.RequirementVersionComparisonService;
import com.nova.emergency.service.RequirementVersionService;
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

@WebMvcTest(controllers = {RequirementVersionController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
class RequirementVersionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private RequirementVersionService versionService;

    @MockBean
    private RequirementVersionComparisonService comparisonService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtFilter jwtFilter;

    private User testUser;
    private Authentication testAuth;
    private RequirementVersionResponse sampleResponse;
    private static final String BASE_URL = "/api/projects/proj-001/requirements/req-001/versions";

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId("user-123");
        testUser.setEmail("janu@reqtrace.ai");
        testUser.setName("Janu");
        testUser.setRole("citizen");

        testAuth = new TestingAuthenticationToken("janu@reqtrace.ai", "password", "ROLE_CITIZEN");

        sampleResponse = RequirementVersionResponse.builder()
                .id("ver-002")
                .projectId("proj-001")
                .requirementId("req-001")
                .versionNumber(2)
                .title("Secure User Login")
                .description("Users must log in using verified credentials.")
                .changeSummary("Improved security requirement")
                .changeType(ChangeType.UPDATED)
                .createdBy("user-123")
                .reviewStatus(ReviewStatus.DRAFT)
                .createdAt(Instant.now().toString())
                .build();

        when(userRepository.findByEmail("janu@reqtrace.ai")).thenReturn(Optional.of(testUser));
    }

    @Test
    @DisplayName("Controller Test 1: Create draft version returns 201 Created")
    void testCreateDraftSuccess() throws Exception {
        CreateRequirementVersionRequest req = CreateRequirementVersionRequest.builder()
                .title("Secure User Login")
                .description("Users must log in using verified credentials.")
                .changeSummary("Improved security requirement")
                .changeType(ChangeType.UPDATED)
                .build();

        when(versionService.createDraftVersion(eq("proj-001"), eq("req-001"), any(CreateRequirementVersionRequest.class), eq("user-123")))
                .thenReturn(sampleResponse);

        mockMvc.perform(post(BASE_URL)
                        .principal(testAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.versionNumber").value(2))
                .andExpect(jsonPath("$.data.title").value("Secure User Login"))
                .andExpect(jsonPath("$.data.reviewStatus").value("DRAFT"));
    }

    @Test
    @DisplayName("Controller Test 2: Invalid draft payload returns 400 Bad Request")
    void testCreateDraftInvalidPayload() throws Exception {
        CreateRequirementVersionRequest invalidReq = CreateRequirementVersionRequest.builder()
                .title("") // Blank title
                .description("")
                .changeSummary("")
                .changeType(null)
                .build();

        mockMvc.perform(post(BASE_URL)
                        .principal(testAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Controller Test 3: List version history returns 200 OK")
    void testGetVersionHistorySuccess() throws Exception {
        when(versionService.getVersionHistory("proj-001", "req-001", "user-123"))
                .thenReturn(List.of(sampleResponse));

        mockMvc.perform(get(BASE_URL)
                        .principal(testAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].versionNumber").value(2))
                .andExpect(jsonPath("$.meta.total").value(1));
    }

    @Test
    @DisplayName("Controller Test 4: Retrieve individual version returns 200 OK")
    void testGetVersionSuccess() throws Exception {
        when(versionService.getVersion("proj-001", "req-001", 2, "user-123"))
                .thenReturn(sampleResponse);

        mockMvc.perform(get(BASE_URL + "/2")
                        .principal(testAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.versionNumber").value(2));
    }

    @Test
    @DisplayName("Controller Test 5: Missing version returns 404 Not Found")
    void testGetVersionNotFound() throws Exception {
        when(versionService.getVersion("proj-001", "req-001", 99, "user-123"))
                .thenThrow(new ResourceNotFoundException("Requirement version 99 not found for requirement: req-001"));

        mockMvc.perform(get(BASE_URL + "/99")
                        .principal(testAuth))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Controller Test 6: Submit for review returns 200 OK")
    void testSubmitForReviewSuccess() throws Exception {
        RequirementVersionResponse inReviewResponse = RequirementVersionResponse.builder()
                .versionNumber(2)
                .reviewStatus(ReviewStatus.IN_REVIEW)
                .build();

        when(versionService.submitForReview("proj-001", "req-001", 2, "user-123"))
                .thenReturn(inReviewResponse);

        mockMvc.perform(post(BASE_URL + "/2/submit")
                        .principal(testAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.reviewStatus").value("IN_REVIEW"));
    }

    @Test
    @DisplayName("Controller Test 7: Invalid review transition returns 409 Conflict")
    void testSubmitForReviewConflict() throws Exception {
        when(versionService.submitForReview("proj-001", "req-001", 2, "user-123"))
                .thenThrow(new InvalidStatusTransitionException("Duplicate submission rejected: Version 2 is already in review."));

        mockMvc.perform(post(BASE_URL + "/2/submit")
                        .principal(testAuth))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("INVALID_STATUS_TRANSITION"));
    }

    @Test
    @DisplayName("Controller Test 8: Approve version returns 200 OK")
    void testApproveVersionSuccess() throws Exception {
        ApproveRequirementVersionRequest req = new ApproveRequirementVersionRequest("Approved after technical review");
        RequirementVersionResponse approvedResponse = RequirementVersionResponse.builder()
                .versionNumber(2)
                .reviewStatus(ReviewStatus.APPROVED)
                .reviewedBy("user-123")
                .approvedBy("user-123")
                .reviewComment("Approved after technical review")
                .build();

        when(versionService.approveVersion("proj-001", "req-001", 2, "Approved after technical review", "user-123"))
                .thenReturn(approvedResponse);

        mockMvc.perform(post(BASE_URL + "/2/approve")
                        .principal(testAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.reviewStatus").value("APPROVED"))
                .andExpect(jsonPath("$.data.reviewComment").value("Approved after technical review"));
    }

    @Test
    @DisplayName("Controller Test 9: Reject version returns 200 OK")
    void testRejectVersionSuccess() throws Exception {
        RejectRequirementVersionRequest req = new RejectRequirementVersionRequest("Acceptance criteria are incomplete.");
        RequirementVersionResponse rejectedResponse = RequirementVersionResponse.builder()
                .versionNumber(2)
                .reviewStatus(ReviewStatus.REJECTED)
                .reviewedBy("user-123")
                .reviewComment("Acceptance criteria are incomplete.")
                .build();

        when(versionService.rejectVersion("proj-001", "req-001", 2, "Acceptance criteria are incomplete.", "user-123"))
                .thenReturn(rejectedResponse);

        mockMvc.perform(post(BASE_URL + "/2/reject")
                        .principal(testAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.reviewStatus").value("REJECTED"))
                .andExpect(jsonPath("$.data.reviewComment").value("Acceptance criteria are incomplete."));
    }

    @Test
    @DisplayName("Controller Test 10: Missing rejection comment returns 400 Bad Request")
    void testRejectVersionMissingComment() throws Exception {
        RejectRequirementVersionRequest emptyReq = new RejectRequirementVersionRequest("");

        mockMvc.perform(post(BASE_URL + "/2/reject")
                        .principal(testAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(emptyReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Controller Test 11: Unauthenticated request returns 401 Unauthorized")
    void testUnauthenticatedRequest() throws Exception {
        mockMvc.perform(get(BASE_URL))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Controller Test 12: Forbidden review action returns 403 Forbidden")
    void testForbiddenReviewAction() throws Exception {
        when(versionService.approveVersion(anyString(), anyString(), anyInt(), any(), eq("user-123")))
                .thenThrow(new AccessDeniedException("Access denied. Insufficient privileges."));

        mockMvc.perform(post(BASE_URL + "/2/approve")
                        .principal(testAuth))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Controller Test 13: Cross-project access returns 404 Not Found")
    void testCrossProjectAccessRejection() throws Exception {
        when(versionService.getVersionHistory("proj-001", "req-foreign", "user-123"))
                .thenThrow(new ResourceNotFoundException("Requirement not found in project: proj-001"));

        mockMvc.perform(get("/api/projects/proj-001/requirements/req-foreign/versions")
                        .principal(testAuth))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Controller Test 14: Compare versions returns 200 OK with deterministic comparison")
    void testCompareVersionsSuccess() throws Exception {
        RequirementVersionComparisonResponse compResponse = RequirementVersionComparisonResponse.builder()
                .requirementId("req-001")
                .fromVersion(1)
                .toVersion(2)
                .hasChanges(true)
                .changedFields(List.of(FieldComparison.builder()
                        .field("description")
                        .oldValue("Users can log in.")
                        .newValue("Users can securely log in.")
                        .addedText(List.of("securely"))
                        .removedText(List.of())
                        .build()))
                .unchangedFields(List.of("title", "changeType", "reviewStatus"))
                .build();

        when(comparisonService.compareVersions("proj-001", "req-001", 1, 2, "user-123"))
                .thenReturn(compResponse);

        mockMvc.perform(get(BASE_URL + "/compare")
                        .param("from", "1")
                        .param("to", "2")
                        .principal(testAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.hasChanges").value(true))
                .andExpect(jsonPath("$.data.fromVersion").value(1))
                .andExpect(jsonPath("$.data.toVersion").value(2))
                .andExpect(jsonPath("$.data.changedFields[0].field").value("description"))
                .andExpect(jsonPath("$.data.changedFields[0].addedText[0]").value("securely"));
    }

    @Test
    @DisplayName("Controller Test 15: Invalid comparison parameters return 400 Bad Request")
    void testCompareVersionsInvalidParams() throws Exception {
        mockMvc.perform(get(BASE_URL + "/compare")
                        .param("from", "-1")
                        .param("to", "2")
                        .principal(testAuth))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));

        mockMvc.perform(get(BASE_URL + "/compare")
                        .principal(testAuth))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}
