package com.finops.core;

import com.finops.core.service.IncidentService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for the status-transition validation logic.
 * This is the core business rule of the service — the one piece of logic
 * that absolutely must be tested before a demo.
 *
 * These tests do NOT start a Spring context — they call the static helper
 * directly, keeping them fast and focused.
 */
class IncidentStatusTransitionTest {

    @Test
    @DisplayName("DETECTED → OPEN is valid (first expected transition)")
    void detectedToOpen() {
        assertThat(IncidentService.isValidTransition("DETECTED", "OPEN")).isTrue();
    }

    @Test
    @DisplayName("DETECTED → RESOLVED is invalid (must progress linearly first)")
    void detectedDirectToResolvedIsInvalid() {
        assertThat(IncidentService.isValidTransition("DETECTED", "RESOLVED")).isFalse();
    }

    @Test
    @DisplayName("Full happy path: each step in the linear flow is valid")
    void fullLinearFlowIsValid() {
        assertThat(IncidentService.isValidTransition("DETECTED", "OPEN")).isTrue();
        assertThat(IncidentService.isValidTransition("OPEN", "ACKNOWLEDGED")).isTrue();
        assertThat(IncidentService.isValidTransition("ACKNOWLEDGED", "INVESTIGATING")).isTrue();
        assertThat(IncidentService.isValidTransition("INVESTIGATING", "MITIGATED")).isTrue();
        assertThat(IncidentService.isValidTransition("MITIGATED", "RESOLVED")).isTrue();
    }

    @Test
    @DisplayName("OPEN → RESOLVED is allowed (emergency fast-close)")
    void openDirectToResolvedIsValid() {
        assertThat(IncidentService.isValidTransition("OPEN", "RESOLVED")).isTrue();
    }

    @Test
    @DisplayName("RESOLVED → anything is invalid (terminal state)")
    void resolvedIsTerminal() {
        assertThat(IncidentService.isValidTransition("RESOLVED", "OPEN")).isFalse();
        assertThat(IncidentService.isValidTransition("RESOLVED", "DETECTED")).isFalse();
        assertThat(IncidentService.isValidTransition("RESOLVED", "MITIGATED")).isFalse();
    }

    @Test
    @DisplayName("Backwards transition (INVESTIGATING → OPEN) is invalid")
    void backwardsTransitionIsInvalid() {
        assertThat(IncidentService.isValidTransition("INVESTIGATING", "OPEN")).isFalse();
    }

    @Test
    @DisplayName("Unknown status → anything returns false gracefully")
    void unknownStatusReturnsFalse() {
        assertThat(IncidentService.isValidTransition("UNKNOWN_STATUS", "OPEN")).isFalse();
    }
}
