"""
SQLAlchemy database connection for the Python AI service.
Connects to the same Supabase Postgres instance as Spring Boot and Node.js.
We only READ from events; we WRITE to anomalies, incidents, incident_anomalies,
and incident_events.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]

# connect_args: sslmode required for Supabase managed Postgres
engine = create_engine(
    DATABASE_URL,
    pool_size=3,
    max_overflow=2,
    pool_pre_ping=True,  # verify connection health before each use
    connect_args={"sslmode": "require"},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency: yields a DB session, closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
