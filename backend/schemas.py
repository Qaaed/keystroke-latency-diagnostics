from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# This represents a single keypress event
class KeystrokeEntry(BaseModel):
    key: str
    dwell_time: float
    flight_time: float

# This is what the Frontend will send to the Backend
class TelemetryCreate(BaseModel):
    hardware_profile: str
    wpm: float
    accuracy: float
    keystroke_data: List[KeystrokeEntry] # A list of the objects above

#This is what the Backend sends back to the Frontend (includes ID and Timestamp)
class TelemetryResponse(TelemetryCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True # This tells Pydantic to work with SQLAlchemy models