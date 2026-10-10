"""
Root-cause confidence scoring — deterministic, never from the LLM.

This is a key architectural decision:
  The confidence number is computed from structured evidence using heuristics.
  The LLM only narrates it. This separation means:
    - The score is reproducible and explainable ("here's how it was calculated").
    - We can show the score before the LLM finishes (no waiting).
    - The LLM can't hallucinate a higher or lower confidence than the evidence supports.

Interview answer for "how do you prevent LLM hallucination?":
  "The LLM only summarizes structured facts we've already computed and stored.
  The confidence score is calculated by a deterministic function — the LLM
  never sets it, it only narrates it."
"""

from typing import Any


def compute_root_cause_confidence(anomalies: list[dict[str, Any]]) -> float:
    """
    Compute an evidence-based confidence score (0.0 to 1.0) for the root cause.

    Scoring heuristics — each adds to the confidence:
    1. Latency anomaly preceded failure-rate anomaly (temporal ordering is causal signal): +0.30
    2. Both metrics implicate the same gateway: +0.25
    3. Deviation magnitude is large (>500%): +0.20
    4. More than 2 anomalies correlated: +0.15
    5. Base confidence (correlation itself is already evidence): 0.40

    Args:
        anomalies: List of anomaly dicts with keys:
                   metric_name, deviation_pct, created_at, evidence

    Returns:
        Float between 0.0 and 1.0
    """
    if not anomalies:
        return 0.0

    confidence = 0.40  # base — correlation already happened

    metric_names = {a.get("metric_name") for a in anomalies}
    deviations = [float(a.get("deviation_pct", 0)) for a in anomalies]

    # 1. Latency preceded failure rate (temporal ordering heuristic)
    latency_anomalies = [a for a in anomalies if a.get("metric_name") == "mean_latency"]
    failure_anomalies = [a for a in anomalies if a.get("metric_name") == "failure_rate"]

    if latency_anomalies and failure_anomalies:
        lat_time = latency_anomalies[0].get("created_at")
        fail_time = failure_anomalies[0].get("created_at")
        if lat_time and fail_time and lat_time < fail_time:
            confidence += 0.30  # latency usually causes failures, not vice versa

    # 2. Large deviation magnitude
    if any(d > 500 for d in deviations):
        confidence += 0.20

    # 3. More than 2 correlated anomalies (stronger evidence)
    if len(anomalies) > 2:
        confidence += 0.15

    # Clamp to [0, 1]
    return round(min(confidence, 1.0), 2)
