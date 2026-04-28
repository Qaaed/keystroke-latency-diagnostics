import json
import os
from typing import List

import firebase_admin
import models
import schemas
from database import engine, get_db
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth, credentials
from sqlalchemy.orm import Session

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Keystroke Latency Diagnostics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

firebase_secret = os.environ.get("FIREBASE_JSON")

try:
    if firebase_secret:
        cred_dict = json.loads(firebase_secret)

        if "project_id" not in cred_dict:
            raise ValueError(
                "FIREBASE_JSON secret is missing 'project_id'. Check your HF Secret contents."
            )

        cred = credentials.Certificate(cred_dict)
        print("Firebase initialized using Hugging Face Secrets.")
    else:
        cred = credentials.Certificate("firebase-credentials.json")
        print("Firebase initialized using local JSON file.")

    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)

except Exception as e:
    print(f"CRITICAL FIREBASE ERROR: {e}")

security = HTTPBearer()


def get_current_user(token: HTTPAuthorizationCredentials = Depends(security)):
    try:
        return auth.verify_id_token(token.credentials)
    except Exception as e:
        print(f"Auth Verification Failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_firebase_uid(current_user: dict = Depends(get_current_user)) -> str:
    firebase_uid = current_user.get("uid")
    if not firebase_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user is missing a Firebase UID",
        )

    return firebase_uid


@app.post("/telemetry/", response_model=schemas.TelemetryResponse)
def create_telemetry(
    payload: schemas.TelemetryCreate,
    db: Session = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    new_session = models.TelemetrySession(
        firebase_uid=firebase_uid,
        hardware_profile=payload.hardware_profile,
        wpm=payload.wpm,
        accuracy=payload.accuracy,
        keystroke_data=[k.dict() for k in payload.keystroke_data],
    )

    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return new_session


@app.get("/telemetry/", response_model=List[schemas.TelemetryResponse])
def get_all_telemetry(
    db: Session = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    return (
        db.query(models.TelemetrySession)
        .filter(models.TelemetrySession.firebase_uid == firebase_uid)
        .order_by(models.TelemetrySession.created_at.desc())
        .all()
    )
