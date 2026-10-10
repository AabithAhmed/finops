"""
FastAPI main application for the /analyze endpoint.
Handles anomaly detection, correlation, and LLM-based root-cause analysis.
"""

import os
from dotenv import load_dotenv
load_dotenv()
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from fastapi import FastAPI, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import Event, Anomaly, Incident
from app.metrics import compute_window_metrics, compute_baseline
from app.detector import compute_anomaly_score, compute_evidence, is_anomalous
from app.correlation import correlate_and_create_incident
from app.root_cause import compute_root_cause_confidence
from app.summary import generate_summary


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[finops-ai-service] Starting up...")
    yield
    print("[finops-ai-service] Shutting down...")


app = FastAPI(
    title="FinOps Sentinel AI — AI Service",
    description="Anomaly detection, incident correlation, and LLM root-cause summaries",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    events: Optional[list[dict[str, Any]]] = None  # if None, we query the DB directly


class AnalyzeResponse(BaseModel):
    anomaly_detected: bool
    anomaly_score: Optional[float] = None
    evidence: Optional[dict[str, Any]] = None
    incident_created: bool = False
    incident_code: Optional[str] = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    request: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Analyzes recent events for anomalies and creates incidents if thresholds are met.
    """

    if request.events:
        window_events = request.events
    else:
        # Query last 60 seconds directly from DB
        cutoff = datetime.now(timezone.utc) - timedelta(seconds=60)
        rows = db.query(Event).filter(Event.occurred_at >= cutoff).all()
        window_events = [
            {
                "event_type": r.event_type,
                "latency_ms": r.latency_ms,
                "occurred_at": r.occurred_at.isoformat(),
            }
            for r in rows
        ]

    if not window_events:
        return AnalyzeResponse(anomaly_detected=False)


    window_metrics = compute_window_metrics(window_events)

    # Baseline: events from 5 minutes ago (prior window)
    baseline_cutoff = datetime.now(timezone.utc) - timedelta(minutes=5)
    baseline_end = datetime.now(timezone.utc) - timedelta(seconds=60)
    baseline_rows = db.query(Event).filter(
        Event.occurred_at >= baseline_cutoff,
        Event.occurred_at < baseline_end
    ).all()
    baseline_events = [
        {"event_type": r.event_type, "latency_ms": r.latency_ms}
        for r in baseline_rows
    ]
    baseline_metrics = compute_baseline(baseline_events) if baseline_events else window_metrics


    score = compute_anomaly_score(window_metrics)
    evidence = compute_evidence(window_metrics, baseline_metrics)

    if not is_anomalous(score) or not evidence:
        return AnalyzeResponse(anomaly_detected=False, anomaly_score=score)


    # Determine which metric is most anomalous (highest deviation)
    top_metric = max(evidence.items(), key=lambda x: x[1]["deviation_pct"])
    metric_name, metric_data = top_metric

    anomaly = Anomaly(
        anomaly_type="FAILURE_RATE_SPIKE" if metric_name == "failure_rate" else "LATENCY_SPIKE",
        metric_name=metric_name,
        metric_value=metric_data["value"],
        baseline_value=metric_data["baseline"],
        deviation_pct=metric_data["deviation_pct"],
        anomaly_score=score,
        evidence=evidence,
        window_start=datetime.now(timezone.utc) - timedelta(seconds=60),
        window_end=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
    )
    db.add(anomaly)
    db.commit()
    db.refresh(anomaly)


    recent_cutoff = datetime.now(timezone.utc) - timedelta(seconds=30)
    recent_anomalies = db.query(Anomaly).filter(
        Anomaly.created_at >= recent_cutoff
    ).all()

    incident = correlate_and_create_incident(db, anomaly, recent_anomalies)

    if incident:

        anomaly_dicts = [
            {
                "metric_name": a.metric_name,
                "metric_value": float(a.metric_value),
                "baseline_value": float(a.baseline_value),
                "deviation_pct": float(a.deviation_pct),
                "created_at": a.created_at,
            }
            for a in recent_anomalies
        ]

        confidence = compute_root_cause_confidence(anomaly_dicts)

        # Save confidence synchronously (fast, deterministic)
        incident.root_cause_confidence = confidence
        db.commit()

        # LLM call is slow — run in background so the response returns immediately
        background_tasks.add_task(
            _generate_and_save_summary,
            incident_id=incident.id,
            incident_code=incident.incident_code,
            anomaly_dicts=anomaly_dicts,
        )

        return AnalyzeResponse(
            anomaly_detected=True,
            anomaly_score=score,
            evidence=evidence,
            incident_created=True,
            incident_code=incident.incident_code,
        )

    return AnalyzeResponse(
        anomaly_detected=True,
        anomaly_score=score,
        evidence=evidence,
    )


async def _generate_and_save_summary(
    incident_id: int,
    incident_code: str,
    anomaly_dicts: list[dict],
):
    """Background task: call LLM, update incident.root_cause_summary."""
    timeline = [f"Anomaly detected: {a['metric_name']} at {a['deviation_pct']}% deviation"
                for a in anomaly_dicts]

    summary = await generate_summary(incident_code, anomaly_dicts, timeline)

    # Need a fresh DB session for the background task (can't reuse request session)
    from app.database import SessionLocal
    bg_db = SessionLocal()
    try:
        inc = bg_db.query(Incident).filter(Incident.id == incident_id).first()
        if inc:
            inc.root_cause_summary = summary
            bg_db.commit()
    finally:
        bg_db.close()
