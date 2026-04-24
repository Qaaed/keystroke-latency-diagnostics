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

# Middleware (CORS) - Set to "*" for deployment testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# ==========================================
# SECURITY LAYER: FIREBASE JWT VERIFICATION
# ==========================================

firebase_secret = os.environ.get("FIREBASE_JSON")

try:
    if firebase_secret:
        # We are on Hugging Face! 
        # Attempting to parse the secret string into a dictionary
        cred_dict = json.loads(firebase_secret)
        
        # Double-check for the specific field your error mentioned
        if "project_id" not in cred_dict:
            raise ValueError("FIREBASE_JSON secret is missing 'project_id'. Check your HF Secret contents.")
            
        cred = credentials.Certificate(cred_dict)
        print("Firebase initialized using Hugging Face Secrets.")
    else:
        # Fallback for local development
        cred = credentials.Certificate("firebase-credentials.json")
        print("Firebase initialized using local JSON file.")

    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)

except Exception as e:
    print(f"CRITICAL FIREBASE ERROR: {e}")
    # We don't stop the app, but Auth routes will fail gracefully with a 401 later

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
        print(f"Auth Verification Failed: {e}")
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
    # Log the authenticated User ID from the JWT
    firebase_uid = current_user.get("uid")
    print(f"🚀 Secured sync from user: {firebase_uid}")

    new_session = models.TelemetrySession(
        hardware_profile=payload.hardware_profile,
        wpm=payload.wpm,
        accuracy=payload.accuracy,
        keystroke_data=[k.dict() for k in payload.keystroke_data] 
    )
    
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    return new_session

@app.get("/telemetry/", response_model=List[schemas.TelemetryResponse])
def get_all_telemetry(db: Session = Depends(get_db)):
    return db.query(models.TelemetrySession).all()