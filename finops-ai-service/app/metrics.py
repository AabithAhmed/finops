"""
Rolling metrics computation for the /analyze endpoint.

Given a list of recent payment events, this module computes:
  - failure_rate: % of events that are PAYMENT_FAILED or PAYMENT_TIMEOUT
  - mean_latency: average latency_ms across all events in the window
  - event_volume: total event count in the window

These three metrics form the feature vector fed into the IsolationForest.
"""

from typing import Any


def compute_window_metrics(events: list[dict[str, Any]]) -> dict[str, float]:
    """
    Compute aggregate metrics for a window of payment events.

    Args:
        events: List of event dicts (from DB rows or Node.js payload).

    Returns:
        Dict with keys: failure_rate, mean_latency, event_volume
    """
    if not events:
        return {"failure_rate": 0.0, "mean_latency": 0.0, "event_volume": 0}

    total = len(events)
    failures = sum(
        1 for e in events
        if e.get("event_type") in ("PAYMENT_FAILED", "PAYMENT_TIMEOUT")
    )
    latencies = [e.get("latency_ms", 0) for e in events]

    return {
        "failure_rate": round(failures / total * 100, 2),       # as percentage
        "mean_latency": round(sum(latencies) / len(latencies), 2),
        "event_volume": total,
    }


def compute_baseline(historical_events: list[dict[str, Any]]) -> dict[str, float]:
    """
    Compute the rolling baseline from a longer historical window
    (e.g., preceding 5 minutes) to compare against the current window.

    Same keys as compute_window_metrics.
    """
    return compute_window_metrics(historical_events)
