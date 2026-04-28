from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from datetime import datetime
from database import Base

TelemetryJson = JSON().with_variant(JSONB, "postgresql")

class TelemetrySession(Base):
    __tablename__ = "telemetry_sessions"

    id = Column(Integer, primary_key=True, index=True)
    firebase_uid = Column(String, index=True, nullable=False)
    hardware_profile = Column(String, index=True) # e.g., "GMMK - Tactile Browns"
    wpm = Column(Float)
    accuracy = Column(Float)
    
    # We use JSON to support both SQLite (for local testing) and Postgres (JSONB in production)
    # This column will hold the massive array of Dwell and Flight times.
    keystroke_data = Column(TelemetryJson)
    
    created_at = Column(DateTime, default=datetime.utcnow)
