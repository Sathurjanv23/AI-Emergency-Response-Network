package com.nova.emergency.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nova.emergency.dto.CreateProjectRequest;
import com.nova.emergency.dto.ProjectResponse;
import com.nova.emergency.dto.UpdateProjectRequest;
import com.nova.emergency.exception.ResourceNotFoundException;
import com.nova.emergency.model.Project;
import com.nova.emergency.model.User;
import com.nova.emergency.repository.UserRepository;
import com.nova.emergency.security.JwtFilter;
import com.nova.emergency.service.ProjectService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {ProjectController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
class ProjectControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ProjectService projectService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtFilter jwtFilter;

    private User testUser;
    private Authentication testAuth;
    private ProjectResponse sampleResponse;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId("user-123");
        testUser.setEmail("janu@reqtrace.ai");
        testUser.setName("Janu");
        testUser.setRole("citizen");

        testAuth = new TestingAuthenticationToken("janu@reqtrace.ai", "password", "ROLE_CITIZEN");

        sampleResponse = ProjectResponse.builder()
                .id("proj-001")
                .name("ReqTrace AI Platform")
                .description("Software requirement evolution and traceability")
                .ownerId("user-123")
                .status(Project.STATUS_ACTIVE)
                .createdAt(Instant.now().toString())
                .updatedAt(Instant.now().toString())
                .build();

        when(userRepository.findByEmail("janu@reqtrace.ai")).thenReturn(Optional.of(testUser));
    }

    @Test
    @DisplayName("API Test: Successful project creation returns 201 Created")
    void testCreateProjectSuccess() throws Exception {
        CreateProjectRequest req = new CreateProjectRequest("ReqTrace AI Platform", "Software requirement evolution and traceability");

        when(projectService.createProject(any(CreateProjectRequest.class), eq("user-123")))
                .thenReturn(sampleResponse);

        mockMvc.perform(post("/api/projects")
                        .principal(testAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value("proj-001"))
                .andExpect(jsonPath("$.data.name").value("ReqTrace AI Platform"))
                .andExpect(jsonPath("$.data.ownerId").value("user-123"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    @DisplayName("API Test: Missing project name returns 400 Bad Request")
    void testCreateProjectMissingNameReturns400() throws Exception {
        CreateProjectRequest req = new CreateProjectRequest("", "Missing name");

        mockMvc.perform(post("/api/projects")
                        .principal(testAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));

        verify(projectService, never()).createProject(any(), any());
    }

    @Test
    @DisplayName("API Test: Listing current user's projects returns 200 OK")
    void testListCurrentUserProjects() throws Exception {
        when(projectService.getAccessibleProjects(eq("user-123"), any()))
                .thenReturn(List.of(sampleResponse));

        mockMvc.perform(get("/api/projects")
                        .principal(testAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value("proj-001"))
                .andExpect(jsonPath("$.data[0].name").value("ReqTrace AI Platform"))
                .andExpect(jsonPath("$.meta.total").value(1));
    }

    @Test
    @DisplayName("API Test: Retrieving an existing project returns 200 OK")
    void testGetProjectByIdSuccess() throws Exception {
        when(projectService.getProjectById(eq("proj-001"), eq("user-123")))
                .thenReturn(sampleResponse);

        mockMvc.perform(get("/api/projects/proj-001")
                        .principal(testAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value("proj-001"))
                .andExpect(jsonPath("$.data.name").value("ReqTrace AI Platform"));
    }

    @Test
    @DisplayName("API Test: Unknown project ID returns 404 Not Found")
    void testGetProjectByIdNotFoundReturns404() throws Exception {
        when(projectService.getProjectById(eq("proj-unknown"), eq("user-123")))
                .thenThrow(new ResourceNotFoundException("Project not found with id: proj-unknown"));

        mockMvc.perform(get("/api/projects/proj-unknown")
                        .principal(testAuth))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API Test: Attempted access to another user's project returns 403 Forbidden without leaking project data")
    void testGetProjectByIdForbiddenReturns403() throws Exception {
        when(projectService.getProjectById(eq("proj-private"), eq("user-123")))
                .thenThrow(new AccessDeniedException("Access denied. Insufficient privileges."));

        mockMvc.perform(get("/api/projects/proj-private")
                        .principal(testAuth))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.message").value("Access denied. Insufficient privileges."));
    }

    @Test
    @DisplayName("API Test: Updating a project returns 200 OK")
    void testUpdateProjectSuccess() throws Exception {
        UpdateProjectRequest req = new UpdateProjectRequest("ReqTrace Renamed", "Updated description", "ACTIVE");
        ProjectResponse updated = ProjectResponse.builder()
                .id("proj-001")
                .name("ReqTrace Renamed")
                .description("Updated description")
                .ownerId("user-123")
                .status("ACTIVE")
                .createdAt(sampleResponse.getCreatedAt())
                .updatedAt(Instant.now().toString())
                .build();

        when(projectService.updateProject(eq("proj-001"), any(UpdateProjectRequest.class), eq("user-123")))
                .thenReturn(updated);

        mockMvc.perform(put("/api/projects/proj-001")
                        .principal(testAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("ReqTrace Renamed"))
                .andExpect(jsonPath("$.message").value("Project updated successfully"));
    }

    @Test
    @DisplayName("API Test: Archiving a project returns 200 OK")
    void testArchiveProjectSuccess() throws Exception {
        ProjectResponse archived = ProjectResponse.builder()
                .id("proj-001")
                .name("ReqTrace AI Platform")
                .ownerId("user-123")
                .status("ARCHIVED")
                .createdAt(sampleResponse.getCreatedAt())
                .updatedAt(Instant.now().toString())
                .build();

        when(projectService.archiveProject(eq("proj-001"), eq("user-123")))
                .thenReturn(archived);

        mockMvc.perform(patch("/api/projects/proj-001/archive")
                        .principal(testAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("ARCHIVED"))
                .andExpect(jsonPath("$.message").value("Project archived successfully"));
    }

    @Test
    @DisplayName("API Test: Unauthenticated request returns 401 Unauthorized")
    void testUnauthenticatedAccessReturns401() throws Exception {
        mockMvc.perform(get("/api/projects"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }
}
