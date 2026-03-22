from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ...database import get_db
from ...models.domain import Session as DemoSession, User
from ...schemas.schemas import SessionCreate, SessionSchema
from .auth import get_current_user

router = APIRouter()

@router.post("/", response_model=SessionSchema)
def create_session(session_data: SessionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_session = DemoSession(
        user_id=current_user.id,
        topic=session_data.topic,
        duration_seconds=session_data.duration_seconds,
        raw_transcript=session_data.raw_transcript,
        analysis_data=session_data.analysis_data
    )
    db.add(new_session)
    
    # Update user streaks (mock logic: increment on new session)
    current_user.streak_count += 1
    
    db.commit()
    db.refresh(new_session)
    return new_session

@router.get("/", response_model=List[SessionSchema])
def get_user_sessions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sessions = db.query(DemoSession).filter(DemoSession.user_id == current_user.id).all()
    return sessions

@router.get("/{session_id}", response_model=SessionSchema)
def get_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(DemoSession).filter(DemoSession.id == session_id, DemoSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session
