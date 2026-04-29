from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# This represents a single keypress event
class KeystrokeEntry(BaseModel):
    key: str
    code: Optional[str] = None
    sequence: Optional[int] = None
    down_at: Optional[float] = None
    up_at: Optional[float] = None
    dwell_time: float
    flight_time: float
    expected_key: Optional[str] = None
    is_correct: Optional[bool] = None

# This is what the Frontend will send to the Backend
class TelemetryCreate(BaseModel):
    hardware_profile: str
    wpm: float
    accuracy: float
    keystroke_data: List[KeystrokeEntry] # A list of the objects above

#This is what the Backend sends back to the Frontend (includes ID and Timestamp)
class TelemetryResponse(TelemetryCreate):
    id: int
    firebase_uid: str
    created_at: datetime

    class Config:
        from_attributes = True # This tells Pydantic to work with SQLAlchemy models


class TelemetrySessionSummary(BaseModel):
    id: int
    firebase_uid: str
    hardware_profile: str
    wpm: float
    accuracy: float
    created_at: datetime

    class Config:
        from_attributes = True


class UserProfileStats(BaseModel):
    firebase_uid: str
    total_sessions: int
    best_wpm: Optional[float] = None
    average_wpm: Optional[float] = None
    best_accuracy: Optional[float] = None
    average_accuracy: Optional[float] = None
    latest_session_at: Optional[datetime] = None


class LeaderboardEntry(UserProfileStats):
    rank: int
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
