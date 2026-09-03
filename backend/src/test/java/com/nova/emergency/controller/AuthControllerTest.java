package com.nova.emergency.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nova.emergency.dto.AuthResponse;
import com.nova.emergency.dto.RegisterRequest;
import com.nova.emergency.dto.VerifyOtpRequest;
import com.nova.emergency.exception.AccountConflictException;
import com.nova.emergency.security.JwtFilter;
import com.nova.emergency.service.AuthService;
import com.nova.emergency.service.GoogleOAuthService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {AuthController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private GoogleOAuthService googleOAuthService;

    @MockBean
    private JwtFilter jwtFilter;

    @Test
    @DisplayName("API Test: Duplicate email returns 409 Conflict with proper error message")
    void testDuplicateEmailReturns409Conflict() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setName("Kamal Silva");
        req.setEmail("kamal@nova.lk");
        req.setPassword("SecurePass123");
        req.setRole("citizen");

        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new AccountConflictException("An account with this email already exists."));

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("An account with this email already exists."));
    }

    @Test
    @DisplayName("API Test: MongoDB DuplicateKeyException returns 409 Conflict")
    void testDatabaseDuplicateKeyExceptionReturns409Conflict() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setName("Kamal Silva");
        req.setEmail("kamal@nova.lk");
        req.setPassword("SecurePass123");
        req.setRole("citizen");

        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new DuplicateKeyException("E11000 duplicate key error collection: users index: email_1 dup key: { email: \"kamal@nova.lk\" }"));

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("An account with this email already exists."));
    }

    @Test
    @DisplayName("API Test: Expired OTP returns 400 Bad Request with clear expiration message")
    void testExpiredOtpReturns400BadRequest() throws Exception {
        VerifyOtpRequest verifyReq = new VerifyOtpRequest("kamal@nova.lk", "123456");

        when(authService.verifyOtp(any(VerifyOtpRequest.class)))
                .thenThrow(new IllegalArgumentException("OTP has expired. Please request a new OTP."));

        mockMvc.perform(post("/api/auth/verify-otp")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(verifyReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("OTP has expired. Please request a new OTP."));
    }

    @Test
    @DisplayName("API Test: Invalid OTP returns 400 Bad Request with Invalid OTP message")
    void testInvalidOtpReturns400BadRequest() throws Exception {
        VerifyOtpRequest verifyReq = new VerifyOtpRequest("kamal@nova.lk", "999999");

        when(authService.verifyOtp(any(VerifyOtpRequest.class)))
                .thenThrow(new IllegalArgumentException("Invalid OTP."));

        mockMvc.perform(post("/api/auth/verify-otp")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(verifyReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Invalid OTP."));
    }

    @Test
    @DisplayName("API Test: Valid OTP within 30 seconds returns 200 OK with AuthResponse")
    void testValidOtpReturns200Ok() throws Exception {
        VerifyOtpRequest verifyReq = new VerifyOtpRequest("kamal@nova.lk", "654321");

        AuthResponse authRes = new AuthResponse();
        authRes.setAccessToken("valid-jwt-token");
        authRes.setTokenType("Bearer");
        authRes.setExpiresIn(86400);

        when(authService.verifyOtp(any(VerifyOtpRequest.class))).thenReturn(authRes);

        mockMvc.perform(post("/api/auth/verify-otp")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(verifyReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("valid-jwt-token"));
    }
}
