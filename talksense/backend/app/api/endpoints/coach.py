from fastapi import APIRouter, Depends, HTTPException
import anthropic
import os
from pydantic import BaseModel
from typing import List, Optional

from .auth import get_current_user
from ...models.domain import User

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context: Optional[dict] = None

def get_mock_coach_response(user_message: str) -> str:
    user_message = user_message.lower()
    if "hello" in user_message or "hi" in user_message:
        return "Hello! I'm your TalkSense AI Coach. I'm here to help you improve your public speaking and communication skills. What would you like to work on today?"
    elif "grammar" in user_message or "doubt" in user_message:
        return "I can certainly help with grammar and any communication doubts you have! Whether it's about sentence structure, vocabulary choice, or how to phrase something more effectively, just ask away."
    elif "confidence" in user_message or "nervous" in user_message:
        return "It's completely normal to feel nervous! My best tip is to focus on your breathing and remember that your audience is there to hear your message, not to judge you. Shall we try a quick warm-up exercise?"
    else:
        return "That's a great question. As your coach, I recommend focusing on clarity and steady pacing when discussing this topic. How do you feel about your current progress in these areas?"

@router.post("/chat")
async def coach_chat(req: ChatRequest, current_user: User = Depends(get_current_user)):
    API_KEY = os.environ.get("ANTHROPIC_API_KEY")
    
    if not API_KEY or API_KEY == "your-api-key":
        # Return mock data if no real key is configured
        last_message = req.messages[-1].content if req.messages else ""
        return {"response": get_mock_coach_response(last_message)}
        
    try:
        client = anthropic.Anthropic(api_key=API_KEY)
        
        system_prompt = """
        You are the TalkSense AI Coach, an expert in public speaking, communication, and linguistics.
        Your goal is to help users improve their speech, confidence, and overall presence.
        
        When a user asks:
        1. Grammatical questions: Provide clear, encouraging corrections and explanations.
        2. Speech tips: Give actionable advice on pacing, volume, filler words, and body language.
        3. General doubts: Be a supportive mentor, offering motivation and behavioral suggestions.
        
        Keep your responses:
        - Concise and natural (like a real coach).
        - Encouraging and professional.
        - Focused on helping the user improve their live performance.
        
        If provided with session context, use it to give personalized feedback.
        """
        
        # Convert ChatMessage list to Anthropic format
        anthropic_messages = []
        for msg in req.messages:
            anthropic_messages.append({"role": msg.role, "content": msg.content})
            
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1000,
            temperature=0.7,
            system=system_prompt,
            messages=anthropic_messages
        )
        
        return {"response": message.content[0].text}
        
    except Exception as e:
        print(f"Error calling Claude: {e}")
        last_message = req.messages[-1].content if req.messages else ""
        return {"response": get_mock_coach_response(last_message)}
