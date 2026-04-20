from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from database import engine, get_db

# Create the database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Keystroke Latency Diagnostics API")

@app.post("/telemetry/", response_model=schemas.TelemetryResponse)
def create_telemetry(payload: schemas.TelemetryCreate, db: Session = Depends(get_db)):
    # Convert the incoming Pydantic data into an SQLAlchemy Model
    new_session = models.TelemetrySession(
        hardware_profile=payload.hardware_profile,
        wpm=payload.wpm,
        accuracy=payload.accuracy,
        keystroke_data=[k.dict() for k in payload.keystroke_data] # Convert list of objects to JSON
    )
    
    #Save it to the database
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    return new_session

@app.get("/telemetry/", response_model=List[schemas.TelemetryResponse])
def get_all_telemetry(db: Session = Depends(get_db)):
    return db.query(models.TelemetrySession).all()