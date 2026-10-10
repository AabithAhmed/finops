"""
Rule-based incident correlation logic.

Design decision: this is explicitly rule-based, NOT ML-based.
Why? Because:
  1. A rule you can explain is more defensible in an interview than a black box.
  2. At this scale (demo) the rules are good enough.
  3. "I chose rules because they're explainable and appropriate for the problem
     size; I'd revisit with a graph-clustering approach at scale" is a strong answer.

Rule: Group anomalies within a rolling 30-second window into ONE incident if
two or more distinct metrics are anomalous together.
"""

from datetime import datetime, timezone
from typing import Any
from sqlalchemy.orm import Session
from app.models import Anomaly, Incident, IncidentAnomaly, IncidentEvent

# Rolling window for correlation: anomalies within this many seconds of each other
# are candidates for grouping into one incident.
CORRELATION_WINDOW_SECONDS = 30

# Severity bucketing thresholds based on highest deviation_pct in the group.
# Justification: arbitrary but documented thresholds that make intuitive sense
# and can be answered confidently in an interview.
# deviation_pct < 200  → LOW    (minor blip, worth watching)
# deviation_pct < 500  → MEDIUM (noticeable degradation, needs attention)
# deviation_pct < 1000 → HIGH   (significant incident, escalate)
# deviation_pct >= 1000 → CRITICAL (severe outage-level event)
SEVERITY_THRESHOLDS = [
    (200,  "LOW"),
    (500,  "MEDIUM"),
    (1000, "HIGH"),
]


def bucket_severity(max_deviation_pct: float) -> str:
    """
    Map the highest deviation_pct in an anomaly group to a severity level.

    Args:
        max_deviation_pct: The largest % deviation from baseline across all
                           anomalies in the correlated group.

    Returns:
        One of: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    """
    for threshold, label in SEVERITY_THRESHOLDS:
        if max_deviation_pct < threshold:
            return label
    return "CRITICAL"


def _next_incident_code(db: Session) -> str:
    """Generate the next sequential incident code, e.g. INC-2026-042."""
    year = datetime.now(timezone.utc).year
    count = db.query(Incident).count()
    return f"INC-{year}-{count + 1:03d}"


def correlate_and_create_incident(
    db: Session,
    new_anomaly: Anomaly,
    all_recent_anomalies: list[Anomaly],
) -> Incident | None:
    """
    Given a newly-created anomaly and the recent anomaly window,
    determine if an incident should be created.

    Returns the created Incident if correlation threshold is met, else None.

    Correlation rule:
    - Look at all anomalies within CORRELATION_WINDOW_SECONDS of this one.
    - If ≥ 2 distinct metrics (e.g. failure_rate AND latency_ms) are anomalous,
      group them into one incident.
    - Only create a new incident if there's no DETECTED/OPEN incident already
      covering this time window (avoid duplicates).
    """
    now = new_anomaly.created_at or datetime.now(timezone.utc)

    # Find anomalies in the rolling window with distinct metric names
    window_anomalies = [
        a for a in all_recent_anomalies
        if a.id != new_anomaly.id  # exclude self
        and a.created_at is not None
        and abs((now - a.created_at.replace(tzinfo=timezone.utc)).total_seconds()) <= CORRELATION_WINDOW_SECONDS
    ]
    window_anomalies.append(new_anomaly)

    distinct_metrics = {a.metric_name for a in window_anomalies}

    # Correlation threshold: 2 or more distinct anomalous metrics
    if len(distinct_metrics) < 2:
        return None

    # Compute severity from the worst deviation in the group
    max_dev = max(float(a.deviation_pct) for a in window_anomalies)
    severity = bucket_severity(max_dev)

    # Collect affected gateways/services from the events
    affected = list({a.anomaly_type for a in window_anomalies})

    incident = Incident(
        incident_code=_next_incident_code(db),
        severity=severity,
        status="DETECTED",
        affected_services=affected,
        created_at=datetime.now(timezone.utc),
    )
    db.add(incident)
    db.flush()  # get the id before adding links

    # Link anomalies to the incident
    for anomaly in window_anomalies:
        link = IncidentAnomaly(incident_id=incident.id, anomaly_id=anomaly.id)
        db.add(link)

    # Write initial timeline entries from the actual anomaly timestamps
    for anomaly in sorted(window_anomalies, key=lambda a: a.created_at or now):
        entry = IncidentEvent(
            incident_id=incident.id,
            event_description=f"{anomaly.metric_name} exceeded threshold "
                              f"({anomaly.deviation_pct:.0f}% deviation from baseline)",
            occurred_at=anomaly.created_at or now,
        )
        db.add(entry)

    # Final timeline entry: incident created
    db.add(IncidentEvent(
        incident_id=incident.id,
        event_description=f"Incident {incident.incident_code} created — "
                          f"{len(window_anomalies)} correlated anomalies, severity {severity}",
        occurred_at=datetime.now(timezone.utc),
    ))

    db.commit()
    db.refresh(incident)
    return incident
