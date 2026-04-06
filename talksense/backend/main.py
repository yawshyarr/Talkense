from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json
import anthropic
from app.api.endpoints import auth, sessions, analyze, coach, vocab
from app.database import engine, Base, init_db
from app.models.domain import User

# Create DB tables
init_db()

app = FastAPI(title="TalkSense API")

# Setup CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://0.0.0.0:3001",
        "http://0.0.0.0:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(analyze.router, prefix="/api", tags=["analysis"])
app.include_router(coach.router, prefix="/api/coach", tags=["coach"])
app.include_router(vocab.router, prefix="/api/vocab", tags=["vocabulary"])

class SentimentRequest(BaseModel):
    transcript_chunk: str
    avg_pitch: float
    avg_volume: float
    words_per_minute: float
    filler_word_count: int
    pause_count: int

@app.post("/api/analyze/sentiment")
async def analyze_sentiment(req: SentimentRequest, current_user: User = Depends(auth.get_current_user)):
    API_KEY = os.environ.get("ANTHROPIC_API_KEY")
    
    # Advanced Mock Logic for faster, more accurate local testing
    if not API_KEY or API_KEY == "your-api-key":
        # 1. Analyze WPM for Focus/Stress
        # Ideal WPM is 120-160. > 180 is Stressed, < 90 is Nervous/Neutral
        # 2. Analyze Volume for Confidence
        # 3. Analyze Pitch for Energy
        
        if req.words_per_minute > 180:
            return {"emotion": "Stressed", "score": 40 + (req.avg_volume / 2)}
        elif req.words_per_minute > 140 and req.avg_volume > 20:
            return {"emotion": "Confident", "score": 85 + (req.avg_pitch / 10)}
        elif req.words_per_minute > 110:
            return {"emotion": "Focused", "score": 90}
        elif req.filler_word_count > 2 or req.pause_count > 2:
            return {"emotion": "Nervous", "score": 45}
        else:
            return {"emotion": "Neutral", "score": 60}

    try:
        client = anthropic.Anthropic(api_key=API_KEY)
        # Stricter, more expert prompt for faster emotional pinpointing
        system_msg = """
        You are an expert Speech-Language Pathologist and Behavioral Analyst. 
        Your task is to instantly determine the speaker's emotional state from short 5-second speech bursts and acoustic metrics.
        
        EMOTION DEFINITIONS:
        - Confident: High volume, steady pitch, optimal WPM (130-160), low fillers.
        - Nervous: Low volume, high pitch (tension), inconsistent WPM, high fillers/pauses.
        - Stressed: Very high WPM (>180), high volume, sharp pitch shifts.
        - Focused: Steady WPM, moderate volume, very low filler count.
        - Neutral: Average metrics across the board.
        
        Return ONLY a JSON object: {"emotion": "ONE_OF_THE_ABOVE", "score": 0-100}
        """
        
        prompt = f"""
        METRICS:
        Text: "{req.transcript_chunk}"
        Pitch: {req.avg_pitch} | Volume: {req.avg_volume} | WPM: {req.words_per_minute}
        Fillers: {req.filler_word_count} | Pauses: {req.pause_count}
        """
        
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=100,
            temperature=0,
            system=system_msg,
            messages=[{"role": "user", "content": prompt}]
        )
        return json.loads(message.content[0].text)
    except Exception:
        return {"emotion": "Neutral", "score": 50}


@app.get("/")
def root():
    return {"message": "Welcome to TalkSense API. Visit /docs for Swagger UI."}
