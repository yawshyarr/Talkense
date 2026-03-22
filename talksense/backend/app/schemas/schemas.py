from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class UserSchema(UserBase):
    id: int
    streak_count: int

    class Config:
        orm_mode = True

class SessionCreate(BaseModel):
    topic: str
    duration_seconds: int
    raw_transcript: str
    analysis_data: Optional[Dict[str, Any]] = None

class SessionSchema(SessionCreate):
    id: int
    user_id: int
    date: datetime

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
