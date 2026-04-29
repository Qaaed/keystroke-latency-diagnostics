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
from sqlalchemy import func
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


def build_user_stats_query(db: Session):
    return (
        db.query(
            models.TelemetrySession.firebase_uid.label("firebase_uid"),
            func.count(models.TelemetrySession.id).label("total_sessions"),
            func.max(models.TelemetrySession.wpm).label("best_wpm"),
            func.avg(models.TelemetrySession.wpm).label("average_wpm"),
            func.max(models.TelemetrySession.accuracy).label("best_accuracy"),
            func.avg(models.TelemetrySession.accuracy).label("average_accuracy"),
            func.max(models.TelemetrySession.created_at).label("latest_session_at"),
        )
        .group_by(models.TelemetrySession.firebase_uid)
    )


def get_public_user_profile(firebase_uid: str):
    try:
        user = auth.get_user(firebase_uid)
        return {
            "display_name": user.display_name,
            "photo_url": user.photo_url,
        }
    except Exception as e:
        print(f"Unable to fetch Firebase user profile for {firebase_uid}: {e}")
        return {
            "display_name": None,
            "photo_url": None,
        }


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


@app.get("/users/me/profile", response_model=schemas.UserProfileStats)
def get_my_profile_stats(
    db: Session = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    stats = (
        build_user_stats_query(db)
        .filter(models.TelemetrySession.firebase_uid == firebase_uid)
        .first()
    )

    if not stats:
        return schemas.UserProfileStats(
            firebase_uid=firebase_uid,
            total_sessions=0,
        )

    return schemas.UserProfileStats(
        firebase_uid=stats.firebase_uid,
        total_sessions=stats.total_sessions,
        best_wpm=stats.best_wpm,
        average_wpm=stats.average_wpm,
        best_accuracy=stats.best_accuracy,
        average_accuracy=stats.average_accuracy,
        latest_session_at=stats.latest_session_at,
    )


@app.get("/leaderboard", response_model=List[schemas.LeaderboardEntry])
def get_leaderboard(
    db: Session = Depends(get_db),
    firebase_uid: str = Depends(get_current_firebase_uid),
):
    rows = (
        build_user_stats_query(db)
        .order_by(
            func.max(models.TelemetrySession.wpm).desc(),
            func.max(models.TelemetrySession.accuracy).desc(),
        )
        .limit(50)
        .all()
    )

    leaderboard = []
    for index, row in enumerate(rows, start=1):
        public_profile = get_public_user_profile(row.firebase_uid)
        leaderboard.append(
            schemas.LeaderboardEntry(
                rank=index,
                firebase_uid=row.firebase_uid,
                total_sessions=row.total_sessions,
                best_wpm=row.best_wpm,
                average_wpm=row.average_wpm,
                best_accuracy=row.best_accuracy,
                average_accuracy=row.average_accuracy,
                latest_session_at=row.latest_session_at,
                display_name=public_profile["display_name"],
                photo_url=public_profile["photo_url"],
            )
        )

    return leaderboard
