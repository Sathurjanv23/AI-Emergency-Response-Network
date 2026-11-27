package com.nova.emergency.dto;

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

class UpdateTraceabilityLinkRequestTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    @DisplayName("Should pass validation with valid updated description")
    void shouldPassValidationWithValidDescription() {
        UpdateTraceabilityLinkRequest request = UpdateTraceabilityLinkRequest.builder()
                .description("Updated relationship context explaining architecture dependency.")
                .build();

        Set<ConstraintViolation<UpdateTraceabilityLinkRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
        assertThat(request.getDescription()).isEqualTo("Updated relationship context explaining architecture dependency.");
    }

    @Test
    @DisplayName("Should pass validation when description is null (omitted)")
    void shouldPassValidationWithNullDescription() {
        UpdateTraceabilityLinkRequest request = UpdateTraceabilityLinkRequest.builder()
                .description(null)
                .build();

        Set<ConstraintViolation<UpdateTraceabilityLinkRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Should pass validation when description is empty string (clearing description)")
    void shouldPassValidationWithEmptyDescription() {
        UpdateTraceabilityLinkRequest request = UpdateTraceabilityLinkRequest.builder()
                .description("")
                .build();

        Set<ConstraintViolation<UpdateTraceabilityLinkRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Should pass validation when description is exactly 1000 characters")
    void shouldPassValidationWithBoundaryDescription() {
        String boundaryDescription = "U".repeat(1000);
        UpdateTraceabilityLinkRequest request = UpdateTraceabilityLinkRequest.builder()
                .description(boundaryDescription)
                .build();

        Set<ConstraintViolation<UpdateTraceabilityLinkRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Should fail validation when description exceeds 1000 characters")
    void shouldFailValidationWithExcessiveDescription() {
        String excessiveDescription = "U".repeat(1001);
        UpdateTraceabilityLinkRequest request = UpdateTraceabilityLinkRequest.builder()
                .description(excessiveDescription)
                .build();

        Set<ConstraintViolation<UpdateTraceabilityLinkRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("description"));
    }

    @Test
    @DisplayName("Should verify that immutable identity and lifecycle fields are NOT exposed")
    void shouldNotExposeImmutableFields() {
        Set<String> declaredFieldNames = Arrays.stream(UpdateTraceabilityLinkRequest.class.getDeclaredFields())
                .map(Field::getName)
                .collect(java.util.stream.Collectors.toSet());

        // Only description should be present
        assertThat(declaredFieldNames).containsExactly("description");
        assertThat(declaredFieldNames).doesNotContain(
                "id", "projectId", "sourceArtifactType", "sourceArtifactId",
                "targetArtifactType", "targetArtifactId", "linkType", "status",
                "createdBy", "createdAt", "updatedAt"
        );
    }
}
