package com.nova.emergency.dto;

import com.nova.emergency.model.ChangeType;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class CreateRequirementVersionRequestTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    @DisplayName("Should pass validation with valid request fields")
    void shouldPassValidationWithValidFields() {
        CreateRequirementVersionRequest request = CreateRequirementVersionRequest.builder()
                .title("Updated User Login Specification")
                .description("System must enforce OAuth2 and password complexity requirements.")
                .changeSummary("Clarified authentication constraints.")
                .changeType(ChangeType.UPDATED)
                .build();

        Set<ConstraintViolation<CreateRequirementVersionRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Should fail validation when title is blank or null")
    void shouldFailValidationWhenTitleIsBlank() {
        CreateRequirementVersionRequest request = CreateRequirementVersionRequest.builder()
                .title("   ")
                .description("Valid description")
                .changeSummary("Valid summary")
                .changeType(ChangeType.UPDATED)
                .build();

        Set<ConstraintViolation<CreateRequirementVersionRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("title"));
    }

    @Test
    @DisplayName("Should fail validation when description is blank or null")
    void shouldFailValidationWhenDescriptionIsBlank() {
        CreateRequirementVersionRequest request = CreateRequirementVersionRequest.builder()
                .title("Valid Title")
                .description("")
                .changeSummary("Valid summary")
                .changeType(ChangeType.UPDATED)
                .build();

        Set<ConstraintViolation<CreateRequirementVersionRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("description"));
    }

    @Test
    @DisplayName("Should fail validation when changeSummary is blank or null")
    void shouldFailValidationWhenChangeSummaryIsBlank() {
        CreateRequirementVersionRequest request = CreateRequirementVersionRequest.builder()
                .title("Valid Title")
                .description("Valid description")
                .changeSummary(null)
                .changeType(ChangeType.UPDATED)
                .build();

        Set<ConstraintViolation<CreateRequirementVersionRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("changeSummary"));
    }

    @Test
    @DisplayName("Should fail validation when changeType is null")
    void shouldFailValidationWhenChangeTypeIsNull() {
        CreateRequirementVersionRequest request = CreateRequirementVersionRequest.builder()
                .title("Valid Title")
                .description("Valid description")
                .changeSummary("Valid summary")
                .changeType(null)
                .build();

        Set<ConstraintViolation<CreateRequirementVersionRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("changeType"));
    }

    @Test
    @DisplayName("Should fail validation when title exceeds size limit")
    void shouldFailValidationWhenTitleExceedsLimit() {
        String longTitle = "A".repeat(201);
        CreateRequirementVersionRequest request = CreateRequirementVersionRequest.builder()
                .title(longTitle)
                .description("Valid description")
                .changeSummary("Valid summary")
                .changeType(ChangeType.CLARIFIED)
                .build();

        Set<ConstraintViolation<CreateRequirementVersionRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("title"));
    }
}
