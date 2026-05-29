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


def build_sentiment_explanation(emotion: str, req: SentimentRequest):
    pace_note = f"{round(req.words_per_minute)} WPM" if req.words_per_minute else "limited pace data"
    volume_note = f"volume {round(req.avg_volume)}" if req.avg_volume else "limited volume data"
    filler_note = f"{req.filler_word_count} filler words"
    pause_note = f"{req.pause_count} notable pauses"

    if emotion == "Confident":
        return f"The speaker sounded confident because the delivery stayed strong and controlled, with {pace_note}, {volume_note}, {filler_note}, and {pause_note}."
    if emotion == "Focused":
        return f"The speaker sounded focused because the speech stayed balanced and purposeful, with {pace_note}, {volume_note}, {filler_note}, and {pause_note}."
    if emotion == "Nervous":
        return f"The speaker sounded nervous because the delivery showed hesitation markers, including {pace_note}, {filler_note}, and {pause_note}."
    if emotion == "Stressed":
        return f"The speaker sounded stressed because the speech pattern suggested pressure or rush, with {pace_note}, {volume_note}, {filler_note}, and {pause_note}."
    return f"The speaker sounded neutral because the speaking pattern stayed fairly even overall, with {pace_note}, {volume_note}, {filler_note}, and {pause_note}."

@app.post("/api/analyze/sentiment")
async def analyze_sentiment(req: SentimentRequest, current_user: User = Depends(auth.get_current_user)):
    API_KEY = os.environ.get("ANTHROPIC_API_KEY")
    
    # Advanced Mock Logic for faster, more accurate local testing
    if not API_KEY or API_KEY == "your-api-key":
        transcript = (req.transcript_chunk or "").lower()

        emotion_scores = {
            "Confident": 45,
            "Focused": 45,
            "Neutral": 40,
            "Nervous": 35,
            "Stressed": 35,
        }

        if 128 <= req.words_per_minute <= 162:
            emotion_scores["Confident"] += 18
            emotion_scores["Focused"] += 12
        elif 110 <= req.words_per_minute < 128:
            emotion_scores["Focused"] += 16
            emotion_scores["Neutral"] += 8
        elif req.words_per_minute > 175:
            emotion_scores["Stressed"] += 28
            emotion_scores["Confident"] -= 6
        elif 0 < req.words_per_minute < 95:
            emotion_scores["Nervous"] += 16
            emotion_scores["Neutral"] += 10

        if req.avg_volume >= 42:
            emotion_scores["Confident"] += 18
            emotion_scores["Stressed"] += 6
        elif 24 <= req.avg_volume < 42:
            emotion_scores["Focused"] += 10
            emotion_scores["Neutral"] += 8
        elif 0 < req.avg_volume < 18:
            emotion_scores["Nervous"] += 14
            emotion_scores["Neutral"] += 6

        if 135 <= req.avg_pitch <= 235:
            emotion_scores["Focused"] += 10
            emotion_scores["Confident"] += 8
        elif req.avg_pitch > 255:
            emotion_scores["Nervous"] += 12
            emotion_scores["Stressed"] += 10
        elif 0 < req.avg_pitch < 110:
            emotion_scores["Neutral"] += 8

        if req.filler_word_count >= 3:
            emotion_scores["Nervous"] += 18
            emotion_scores["Confident"] -= 8
        elif req.filler_word_count == 0:
            emotion_scores["Focused"] += 6

        if req.pause_count >= 3:
            emotion_scores["Nervous"] += 12
        elif req.pause_count == 0 and req.words_per_minute > 165:
            emotion_scores["Stressed"] += 10

        if any(word in transcript for word in ["excited", "happy", "grateful", "proud", "confident"]):
            emotion_scores["Confident"] += 8
        if any(word in transcript for word in ["worried", "nervous", "anxious", "afraid"]):
            emotion_scores["Nervous"] += 10
        if any(word in transcript for word in ["urgent", "pressure", "stress", "deadline"]):
            emotion_scores["Stressed"] += 10

        emotion, raw_score = max(emotion_scores.items(), key=lambda item: item[1])
        return {
            "emotion": emotion,
            "score": max(0, min(100, round(raw_score))),
            "explanation": build_sentiment_explanation(emotion, req)
        }

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
        parsed = json.loads(message.content[0].text)
        emotion = parsed.get("emotion", "Neutral")
        score = max(0, min(100, round(parsed.get("score", 50))))
        return {
            "emotion": emotion,
            "score": score,
            "explanation": build_sentiment_explanation(emotion, req)
        }
    except Exception:
        return {
            "emotion": "Neutral",
            "score": 50,
            "explanation": build_sentiment_explanation("Neutral", req)
        }


@app.get("/")
def root():
    return {"message": "Welcome to TalkSense API. Visit /docs for Swagger UI."}
