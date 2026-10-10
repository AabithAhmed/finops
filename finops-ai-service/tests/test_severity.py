"""Tests for correlation grouping and severity bucketing."""

import pytest
from app.correlation import bucket_severity, SEVERITY_THRESHOLDS


class TestSeverityBucketing:
    """
    These thresholds are the most likely interview question:
    "What counts as CRITICAL vs HIGH and why?"
    Answer: deviation_pct < 200 = LOW, < 500 = MEDIUM, < 1000 = HIGH, >= 1000 = CRITICAL.
    They're deliberately round numbers — easy to explain and remember.
    """

    def test_low_severity(self):
        assert bucket_severity(100) == "LOW"
        assert bucket_severity(199.9) == "LOW"

    def test_medium_severity(self):
        assert bucket_severity(200) == "MEDIUM"
        assert bucket_severity(499.9) == "MEDIUM"

    def test_high_severity(self):
        assert bucket_severity(500) == "HIGH"
        assert bucket_severity(999.9) == "HIGH"

    def test_critical_severity(self):
        assert bucket_severity(1000) == "CRITICAL"
        assert bucket_severity(5000) == "CRITICAL"
        assert bucket_severity(9999) == "CRITICAL"

    def test_boundary_at_200(self):
        """Exactly 200% should be MEDIUM, not LOW."""
        assert bucket_severity(200.0) == "MEDIUM"

    def test_boundary_at_1000(self):
        """Exactly 1000% should be CRITICAL."""
        assert bucket_severity(1000.0) == "CRITICAL"

    def test_zero_deviation(self):
        """Zero deviation = LOW — not anomalous enough to escalate."""
        assert bucket_severity(0) == "LOW"
