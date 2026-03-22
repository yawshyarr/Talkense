from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime, timezone

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    streak_count = Column(Integer, default=0)
    
    sessions = relationship("Session", back_populates="user")

class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    topic = Column(String)
    duration_seconds = Column(Integer)
    raw_transcript = Column(Text)
    
    # Simple JSON storing score data to avoid over-complicating schema
    analysis_data = Column(JSON, nullable=True)
    
    user = relationship("User", back_populates="sessions")
