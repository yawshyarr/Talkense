from fastapi import APIRouter, Depends, HTTPException
import anthropic
import os
import json
from pydantic import BaseModel

from .auth import get_current_user
from ...models.domain import User

router = APIRouter()

class AnalysisRequest(BaseModel):
    transcript: str
    topic: str
    duration_seconds: int
    difficulty: str

# Mock analyzer for when API key is not present
def mock_analysis(transcript: str, duration_seconds: int):
    word_count = len(transcript.split())
    pace = round(word_count / (duration_seconds / 60)) if duration_seconds > 0 else 0
    filler_words_found = sum(1 for word in transcript.lower().split() if word in ['um', 'uh', 'like', 'basically', 'so'])
    
    return {
        "scores": {
            "fluency": 85 - filler_words_found,
            "clarity": 88,
            "pace": pace,
            "vocabulary": 82,
            "confidence": 90
        },
        "feedback": {
            "pros": ["Good volume", "Clear articulation in the beginning"],
            "cons": [f"Used {filler_words_found} filler words", "Pace varied slightly"],
            "tips": ["Try to pause instead of saying 'um'"]
        },
        "stats": {
            "words_spoken": word_count,
            "pace": pace,
            "filler_count": filler_words_found
        }
    }

@router.post("/analyze")
def analyze_speech(req: AnalysisRequest, current_user: User = Depends(get_current_user)):
    API_KEY = os.environ.get("ANTHROPIC_API_KEY")
    
    if not API_KEY or API_KEY == "your-api-key":
        # Return mock data if no real key is configured
        return mock_analysis(req.transcript, req.duration_seconds)
        
    try:
        client = anthropic.Anthropic(api_key=API_KEY)
        prompt = f"""
        Analyze the following speech transcript for a user practicing speaking. 
        Topic: {req.topic}
        Difficulty Goal: {req.difficulty}
        Duration: {req.duration_seconds} seconds
        
        Transcript: "{req.transcript}"
        
        Return ONLY a JSON object with this exact structure:
        {{
            "scores": {{"fluency": int 0-100, "clarity": int 0-100, "pace": int 0-100, "vocabulary": int 0-100, "confidence": int 0-100}},
            "feedback": {{"pros": ["string"], "cons": ["string"], "tips": ["string"]}},
            "stats": {{"words_spoken": int, "pace": int, "filler_count": int}}
        }}
        """
        
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1000,
            temperature=0.1,
            system="You are an expert public speaking coach. You always return valid JSON that can be parsed.",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        response_text = message.content[0].text
        # Clean up in case claude wrapped in markdown
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        
        return json.loads(response_text)
        
    except Exception as e:
        print(f"Error calling Claude: {e}")
        return mock_analysis(req.transcript, req.duration_seconds)
