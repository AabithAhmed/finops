"""
Anomaly detection using IsolationForest (scikit-learn) + per-metric z-score evidence.

Two distinct outputs — it's important to understand the distinction:

1. ANOMALY SCORE (IsolationForest):
   - Flags THAT something is unusual in the feature vector [failure_rate, mean_latency, volume].
   - Scores < -0.1 typically indicate an anomaly (IsolationForest returns negative scores
     for outliers; the threshold is tunable).
   - This is a black-box score — it tells us *something* is off but not *which* metric.

2. EVIDENCE (per-metric % deviation from baseline):
   - Tells us WHY the anomaly was flagged — which specific metrics moved and by how much.
   - Computed independently from the IsolationForest score using simple arithmetic.
   - This is what we show to the user and what we store in anomalies.evidence.
   - The LLM narrates this evidence; it never invents its own diagnosis.
"""

import numpy as np
from sklearn.ensemble import IsolationForest
from typing import Any

# IsolationForest anomaly threshold.
# IsolationForest.score_samples() returns values in roughly (-1, 0).
# Values below ANOMALY_THRESHOLD are considered anomalous.
# -0.1 is a reasonable starting point; tune based on false positive rate.
ANOMALY_THRESHOLD = -0.1

# Minimum deviation percentage to consider a metric "significantly anomalous"
# in the evidence. This prevents noise from being highlighted.
MIN_EVIDENCE_DEVIATION_PCT = 50.0


def compute_anomaly_score(window_metrics: dict[str, float]) -> float:
    """
    Run IsolationForest on a single feature vector from the current window metrics.

    We fit the model on a single point here, which is a simplification suitable
    for a demo — in production you'd maintain a rolling training set of historical
    windows and fit/retrain periodically.

    Returns the anomaly score (negative = anomalous, closer to 0 = normal).
    """
    features = np.array([[
        window_metrics["failure_rate"],
        window_metrics["mean_latency"],
        window_metrics["event_volume"],
    ]])

    # n_estimators=100 is the sklearn default, contamination=0.1 means we expect
    # ~10% of windows to be anomalous (tunable).
    model = IsolationForest(n_estimators=100, contamination=0.1, random_state=42)
    model.fit(features)
    score = model.score_samples(features)[0]
    return float(score)


def compute_evidence(
    window_metrics: dict[str, float],
    baseline_metrics: dict[str, float],
) -> dict[str, dict[str, float]]:
    """
    Compute per-metric deviation from baseline.
    This is the human-readable "why" — separate from the IsolationForest score.

    Returns a dict like:
    {
      "failure_rate": {"value": 42.0, "baseline": 1.3, "deviation_pct": 3131},
      "latency_ms":   {"value": 4200,  "baseline": 220,  "deviation_pct": 1809},
    }

    Only includes metrics where deviation is significant (> MIN_EVIDENCE_DEVIATION_PCT).
    """
    evidence: dict[str, dict[str, float]] = {}

    metrics_map = {
        "failure_rate": ("failure_rate", "failure_rate"),
        "latency_ms": ("mean_latency", "mean_latency"),
    }

    for label, (window_key, baseline_key) in metrics_map.items():
        value = window_metrics.get(window_key, 0.0)
        baseline = baseline_metrics.get(baseline_key, 0.0)

        if baseline == 0:
            continue  # avoid division by zero

        deviation_pct = abs(value - baseline) / baseline * 100

        if deviation_pct >= MIN_EVIDENCE_DEVIATION_PCT:
            evidence[label] = {
                "value": round(value, 2),
                "baseline": round(baseline, 2),
                "deviation_pct": round(deviation_pct, 0),
            }

    return evidence


def is_anomalous(score: float) -> bool:
    """Return True if the IsolationForest score indicates an anomaly."""
    return score < ANOMALY_THRESHOLD
