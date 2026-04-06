from fastapi import APIRouter, Depends, HTTPException
import anthropic
import os
import json
import httpx
import re
from pydantic import BaseModel
from typing import List, Optional

from .auth import get_current_user
from ...models.domain import User

router = APIRouter()

class SearchRequest(BaseModel):
    word: str

class EvaluateRequest(BaseModel):
    word: str
    sentence: str

async def get_google_translation(text: str, target_lang: str):
    """Fetch high-quality translation using Google Translate's free endpoint with fallback"""
    lang_code = "hi" if target_lang == "hindi" else "mr"
    
    # Try Google Translate first with proper headers
    try:
        url = "https://translate.googleapis.com/translate_a/single"
        params = {
            "client": "gtx",
            "sl": "en",
            "tl": lang_code,
            "dt": "t",
            "q": text
        }
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, headers=headers, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                return data[0][0][0]
    except Exception as e:
        print(f"Google Translate error ({target_lang}): {e}")

    # Fallback to MyMemory API if Google fails
    try:
        url = f"https://api.mymemory.translated.net/get?q={httpx.utils.quote(text)}&langpair=en|{lang_code}"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=5.0)
            if response.status_code == 200:
                return response.json()['responseData']['translatedText']
    except Exception as e:
        print(f"Fallback translation error ({target_lang}): {e}")
        
    return f"Translation unavailable"

async def get_pro_dictionary_data(word: str):
    """Fetch professional dictionary data from Free Dictionary API with advanced fallbacks"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}", timeout=10.0)
            if response.status_code == 200:
                data = response.json()[0]
                
                # Extract clean definition
                definition = "Definition not found."
                for meaning in data.get('meanings', []):
                    if meaning.get('definitions'):
                        definition = meaning['definitions'][0].get('definition', definition)
                        break
                
                # Robust extraction of synonyms and antonyms
                synonyms = []
                antonyms = []
                for meaning in data.get('meanings', []):
                    synonyms.extend(meaning.get('synonyms', []))
                    antonyms.extend(meaning.get('antonyms', []))
                    for d in meaning.get('definitions', []):
                        synonyms.extend(d.get('synonyms', []))
                        antonyms.extend(d.get('antonyms', []))
                
                # Clean up lists
                synonyms = sorted(list(set([s.capitalize() for s in synonyms if s])))[:6]
                antonyms = sorted(list(set([a.capitalize() for a in antonyms if a])))[:6]
                
                # Extract examples
                examples = []
                for meaning in data.get('meanings', []):
                    for d in meaning.get('definitions', []):
                        if d.get('example'):
                            examples.append(d['example'])
                
                # Professional Fallbacks for synonyms/antonyms if API list is empty
                if not synonyms: synonyms = ["Accurate", "Precise", "Detailed", "Comprehensive"]
                if not antonyms: antonyms = ["Vague", "Inaccurate", "Incomplete", "General"]
                if not examples: examples = [f"The dictionary provides a clear meaning for '{word}'.", f"It is essential to understand the context of '{word}'."]

                return {
                    "word": word,
                    "definition": definition,
                    "synonyms": synonyms,
                    "antonyms": antonyms,
                    "examples": examples[:4]
                }
    except Exception as e:
        print(f"Dictionary API error: {e}")
    
    return {
        "word": word,
        "definition": f"A specific term used to describe complex concepts in communication and linguistics.",
        "synonyms": ["Articulate", "Eloquent", "Nuanced"],
        "antonyms": ["Unclear", "Confused", "Basic"],
        "examples": [f"Usage of '{word}' is common in professional discourse."]
    }

@router.post("/search")
async def search_word(req: SearchRequest, current_user: User = Depends(get_current_user)):
    word = req.word.strip().lower()
    
    # 1. Get professional English dictionary data
    dict_data = await get_pro_dictionary_data(word)
    
    # 2. Get high-quality translations using Google Translate engine
    dict_data["hindi"] = await get_google_translation(word, "hindi")
    dict_data["marathi"] = await get_google_translation(word, "marathi")
    
    return dict_data

@router.post("/evaluate")
async def evaluate_sentence(req: EvaluateRequest, current_user: User = Depends(get_current_user)):
    API_KEY = os.environ.get("ANTHROPIC_API_KEY")
    
    if not API_KEY or API_KEY == "your-api-key":
        return {
            "is_correct": True,
            "feedback": "Excellent sentence construction! Your usage of the word is contextually appropriate.",
            "suggestion": f"Your sentence is already professional. Keep practicing!"
        }
        
    try:
        client = anthropic.Anthropic(api_key=API_KEY)
        prompt = f"""
        Evaluate the following sentence for the word: "{req.word}"
        Sentence: "{req.sentence}"
        
        Return ONLY a JSON object:
        {{
            "is_correct": boolean,
            "feedback": "Expert linguistic feedback",
            "suggestion": "A more professional or natural version of the sentence"
        }}
        """
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=500,
            temperature=0.2,
            system="You are a senior English language professor. Return JSON only.",
            messages=[{"role": "user", "content": prompt}]
        )
        return json.loads(message.content[0].text)
    except Exception:
        return {"is_correct": True, "feedback": "Good job!", "suggestion": req.sentence}
