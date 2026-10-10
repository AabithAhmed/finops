"""Tests for the correlation grouping rule logic."""

import pytest
from app.correlation import bucket_severity, CORRELATION_WINDOW_SECONDS


class TestCorrelationRule:
    """
    Tests that document and verify the core correlation rule:
    "Group anomalies within 30 seconds if ≥2 distinct metrics are anomalous."

    Note: The full correlate_and_create_incident() function requires a DB session,
    so we test the pure logic parts (severity + rule constants) here,
    and rely on integration tests for the full DB flow.
    """

    def test_correlation_window_is_30_seconds(self):
        """Document that the window is 30s — a reviewable, changeable constant."""
        assert CORRELATION_WINDOW_SECONDS == 30

    def test_high_deviation_is_critical(self):
        """A 3000% failure rate spike should be CRITICAL."""
        assert bucket_severity(3000) == "CRITICAL"

    def test_moderate_deviation_is_medium(self):
        """300% deviation (e.g. failure rate 3x baseline) is MEDIUM."""
        assert bucket_severity(300) == "MEDIUM"

    def test_severity_scales_monotonically(self):
        """Higher deviation should never produce lower severity."""
        severities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        test_values = [100, 300, 700, 2000]
        results = [bucket_severity(v) for v in test_values]
        
        # Each result should be at least as severe as the previous
        for i in range(1, len(results)):
            prev_idx = severities.index(results[i - 1])
            curr_idx = severities.index(results[i])
            assert curr_idx >= prev_idx, (
                f"Severity decreased: {results[i-1]} → {results[i]} "
                f"for values {test_values[i-1]} → {test_values[i]}"
            )
