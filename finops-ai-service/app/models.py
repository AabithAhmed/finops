"""
SQLAlchemy ORM models matching the Supabase schema (02-supabase-schema.sql).
We do NOT use Base.metadata.create_all() — the tables already exist.
These models are purely for reading and writing rows.
"""

from datetime import datetime
from typing import Any, Optional
from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, ForeignKey,
    Integer, Numeric, String, Text, ARRAY
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    event_id = Column(String, nullable=False, unique=True)
    event_type = Column(String, nullable=False)
    payment_id = Column(String, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String, nullable=False, default="INR")
    gateway = Column(String, nullable=False)
    latency_ms = Column(Integer, nullable=False)
    occurred_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)


class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    anomaly_type = Column(String, nullable=False)
    metric_name = Column(String, nullable=False)
    metric_value = Column(Numeric, nullable=False)
    baseline_value = Column(Numeric, nullable=False)
    deviation_pct = Column(Numeric, nullable=False)
    anomaly_score = Column(Numeric, nullable=False)
    evidence = Column(JSONB, nullable=False)
    window_start = Column(DateTime(timezone=True), nullable=False)
    window_end = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    incident_code = Column(String, nullable=False, unique=True)
    severity = Column(String, nullable=False)
    status = Column(String, nullable=False, default="DETECTED")
    affected_services = Column(ARRAY(Text), nullable=False, default=[])
    root_cause_summary = Column(Text)
    root_cause_confidence = Column(Numeric)
    # embedding column (vector(384)) intentionally not mapped — Python pgvector
    # integration is out of scope for MVP; the column exists in the schema
    # as a stretch feature placeholder.
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    resolved_at = Column(DateTime(timezone=True))


class IncidentAnomaly(Base):
    __tablename__ = "incident_anomalies"

    incident_id = Column(BigInteger, ForeignKey("incidents.id", ondelete="CASCADE"), primary_key=True)
    anomaly_id = Column(BigInteger, ForeignKey("anomalies.id", ondelete="CASCADE"), primary_key=True)


class IncidentEvent(Base):
    __tablename__ = "incident_events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    incident_id = Column(BigInteger, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False)
    event_description = Column(Text, nullable=False)
    occurred_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
