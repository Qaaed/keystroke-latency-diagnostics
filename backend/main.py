import os
import json
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, auth
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

import models, schemas
from database import engine, get_db

# Create the database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Keystroke Latency Diagnostics API")

# Middleware (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://localhost:3000"], # Allows local Next.js app
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# SECURITY LAYER: FIREBASE JWT VERIFICATION

# Check if we are running on Hugging Face (using Secrets) or locally
firebase_secret = os.environ.get("FIREBASE_JSON")

if firebase_secret:
    # We are on Hugging Face! Parse the secret string into a dictionary
    cred_dict = json.loads(firebase_secret)
    cred = credentials.Certificate(cred_dict)
else:
    # We are running locally! Fall back to the physical file
    cred = credentials.Certificate("firebase-credentials.json")

# Only initialize if it hasn't been initialized yet
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

security = HTTPBearer()

def get_current_user(token: HTTPAuthorizationCredentials = Depends(security)):
    """
    Intercepts the incoming request, extracts the Bearer token, and 
    asks Google to cryptographically verify it.
    """
    try:
        decoded_token = auth.verify_id_token(token.credentials)
        return decoded_token
    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

# ==========================================
# API ROUTES
# ==========================================

@app.post("/telemetry/", response_model=schemas.TelemetryResponse)
def create_telemetry(
    payload: schemas.TelemetryCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user) 
):
    # Extract the unique Firebase User ID 
    firebase_uid = current_user.get("uid")
    print(f" Receiving secured telemetry sync from user: {firebase_uid}")

    # Convert the incoming Pydantic data into an SQLAlchemy Model
    new_session = models.TelemetrySession(
        hardware_profile=payload.hardware_profile,
        wpm=payload.wpm,
        accuracy=payload.accuracy,
        keystroke_data=[k.dict() for k in payload.keystroke_data] # Convert list of objects to JSON
    )
    
    # Save it to the database
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    return new_session


@app.get("/telemetry/", response_model=List[schemas.TelemetryResponse])
def get_all_telemetry(db: Session = Depends(get_db)):
    # Currently open to the public, add `current_user` dependency if you want to lock this too!
    return db.query(models.TelemetrySession).all()