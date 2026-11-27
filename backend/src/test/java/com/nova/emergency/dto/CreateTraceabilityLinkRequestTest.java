package com.nova.emergency.dto;

import com.nova.emergency.model.TraceabilityArtifactType;
import com.nova.emergency.model.TraceabilityLinkType;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class CreateTraceabilityLinkRequestTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    @DisplayName("Should pass validation with all valid fields including description")
    void shouldPassValidationWithValidFields() {
        CreateTraceabilityLinkRequest request = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-101")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-102")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .description("Valid description for dependency link")
                .build();

        Set<ConstraintViolation<CreateTraceabilityLinkRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Should pass validation with null optional description")
    void shouldPassValidationWithNullDescription() {
        CreateTraceabilityLinkRequest request = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-101")
                .targetArtifactType(TraceabilityArtifactType.TEST_CASE)
                .targetArtifactId("tc-202")
                .linkType(TraceabilityLinkType.VERIFIED_BY)
                .description(null)
                .build();

        Set<ConstraintViolation<CreateTraceabilityLinkRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Should pass validation with empty optional description")
    void shouldPassValidationWithEmptyDescription() {
        CreateTraceabilityLinkRequest request = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-101")
                .targetArtifactType(TraceabilityArtifactType.CODE_REFERENCE)
                .targetArtifactId("auth.service")
                .linkType(TraceabilityLinkType.IMPLEMENTED_BY)
                .description("")
                .build();

        Set<ConstraintViolation<CreateTraceabilityLinkRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Should fail validation when sourceArtifactType is null")
    void shouldFailValidationWhenSourceArtifactTypeIsNull() {
        CreateTraceabilityLinkRequest request = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(null)
                .sourceArtifactId("req-101")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-102")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        Set<ConstraintViolation<CreateTraceabilityLinkRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("sourceArtifactType"));
    }

    @Test
    @DisplayName("Should fail validation when sourceArtifactId is missing or null")
    void shouldFailValidationWhenSourceArtifactIdIsNull() {
        CreateTraceabilityLinkRequest request = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId(null)
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-102")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        Set<ConstraintViolation<CreateTraceabilityLinkRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("sourceArtifactId"));
    }

    @Test
    @DisplayName("Should fail validation when sourceArtifactId is blank")
    void shouldFailValidationWhenSourceArtifactIdIsBlank() {
        CreateTraceabilityLinkRequest request = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("   ")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-102")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        Set<ConstraintViolation<CreateTraceabilityLinkRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("sourceArtifactId"));
    }

    @Test
    @DisplayName("Should fail validation when targetArtifactType is null")
    void shouldFailValidationWhenTargetArtifactTypeIsNull() {
        CreateTraceabilityLinkRequest request = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-101")
                .targetArtifactType(null)
                .targetArtifactId("req-102")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        Set<ConstraintViolation<CreateTraceabilityLinkRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("targetArtifactType"));
    }

    @Test
    @DisplayName("Should fail validation when targetArtifactId is missing or null")
    void shouldFailValidationWhenTargetArtifactIdIsNull() {
        CreateTraceabilityLinkRequest request = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-101")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId(null)
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        Set<ConstraintViolation<CreateTraceabilityLinkRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("targetArtifactId"));
    }

    @Test
    @DisplayName("Should fail validation when targetArtifactId is blank")
    void shouldFailValidationWhenTargetArtifactIdIsBlank() {
        CreateTraceabilityLinkRequest request = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-101")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("  \t  ")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        Set<ConstraintViolation<CreateTraceabilityLinkRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("targetArtifactId"));
    }

    @Test
    @DisplayName("Should fail validation when linkType is null")
    void shouldFailValidationWhenLinkTypeIsNull() {
        CreateTraceabilityLinkRequest request = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-101")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-102")
                .linkType(null)
                .build();

        Set<ConstraintViolation<CreateTraceabilityLinkRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("linkType"));
    }

    @Test
    @DisplayName("Should fail validation when description exceeds 1000 characters")
    void shouldFailValidationWhenDescriptionExceedsLimit() {
        String excessiveDescription = "D".repeat(1001);
        CreateTraceabilityLinkRequest request = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-101")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-102")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .description(excessiveDescription)
                .build();

        Set<ConstraintViolation<CreateTraceabilityLinkRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("description"));
    }

    @Test
    @DisplayName("Should pass validation when description is exactly 1000 characters")
    void shouldPassValidationWhenDescriptionIsAtBoundary() {
        String boundaryDescription = "D".repeat(1000);
        CreateTraceabilityLinkRequest request = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-101")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-102")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .description(boundaryDescription)
                .build();

        Set<ConstraintViolation<CreateTraceabilityLinkRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Should fail validation when sourceArtifactId exceeds 100 characters")
    void shouldFailValidationWhenSourceArtifactIdExceedsLimit() {
        String longId = "S".repeat(101);
        CreateTraceabilityLinkRequest request = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId(longId)
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId("req-102")
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        Set<ConstraintViolation<CreateTraceabilityLinkRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("sourceArtifactId"));
    }

    @Test
    @DisplayName("Should fail validation when targetArtifactId exceeds 100 characters")
    void shouldFailValidationWhenTargetArtifactIdExceedsLimit() {
        String longId = "T".repeat(101);
        CreateTraceabilityLinkRequest request = CreateTraceabilityLinkRequest.builder()
                .sourceArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .sourceArtifactId("req-101")
                .targetArtifactType(TraceabilityArtifactType.REQUIREMENT)
                .targetArtifactId(longId)
                .linkType(TraceabilityLinkType.DEPENDS_ON)
                .build();

        Set<ConstraintViolation<CreateTraceabilityLinkRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("targetArtifactId"));
    }

    @Test
    @DisplayName("Should confirm client-controlled fields are not declared in request DTO")
    void shouldNotExposeClientControlledFields() {
        Set<String> declaredFieldNames = Arrays.stream(CreateTraceabilityLinkRequest.class.getDeclaredFields())
                .map(Field::getName)
                .collect(java.util.stream.Collectors.toSet());

        assertThat(declaredFieldNames).doesNotContain("id", "projectId", "status", "createdBy", "createdAt", "updatedAt");
    }
}
