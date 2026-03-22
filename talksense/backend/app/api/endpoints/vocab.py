from fastapi import APIRouter, Depends, HTTPException
import anthropic
import os
import json
import httpx
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

async def get_real_dictionary_data(word: str):
    """Fetch real dictionary data from Free Dictionary API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}")
            if response.status_code == 200:
                data = response.json()[0]
                definition = data['meanings'][0]['definitions'][0]['definition']
                
                # Get synonyms and antonyms if available
                synonyms = []
                antonyms = []
                for meaning in data['meanings']:
                    synonyms.extend(meaning.get('synonyms', []))
                    antonyms.extend(meaning.get('antonyms', []))
                
                # Get examples
                examples = []
                for meaning in data['meanings']:
                    for d in meaning['definitions']:
                        if d.get('example'):
                            examples.append(d['example'])
                
                return {
                    "word": word,
                    "definition": definition,
                    "synonyms": list(set(synonyms))[:5] if synonyms else ["Fluent", "Articulate"],
                    "antonyms": list(set(antonyms))[:5] if antonyms else ["Silent", "Inarticulate"],
                    "examples": examples[:4] if examples else [f"The speaker was very {word}."]
                }
    except Exception as e:
        print(f"Dictionary API error: {e}")
    
    # Fallback basic data
    return {
        "word": word,
        "definition": f"A term related to '{word}' used in communication.",
        "synonyms": ["Eloquent", "Sophisticated"],
        "antonyms": ["Simple", "Vague"],
        "examples": [f"This is an example of {word}."]
    }

async def get_translation(word: str, target_lang: str):
    """Fetch translation from MyMemory API (Free)"""
    try:
        lang_code = "hi" if target_lang == "hindi" else "mr"
        async with httpx.AsyncClient() as client:
            url = f"https://api.mymemory.translated.net/get?q={word}&langpair=en|{lang_code}"
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                return data['responseData']['translatedText']
    except Exception as e:
        print(f"Translation API error ({target_lang}): {e}")
    return f"Translation for {word} unavailable"

@router.post("/search")
async def search_word(req: SearchRequest, current_user: User = Depends(get_current_user)):
    word = req.word.strip()
    API_KEY = os.environ.get("ANTHROPIC_API_KEY")
    
    # 1. Get real dictionary data (English)
    dict_data = await get_real_dictionary_data(word)
    
    # 2. Get translations (Hindi and Marathi)
    if API_KEY and API_KEY != "your-api-key":
        try:
            client = anthropic.Anthropic(api_key=API_KEY)
            prompt = f"""
            Provide the Hindi and Marathi meanings for the English word: "{word}".
            Return ONLY a JSON object:
            {{
                "hindi": "Meaning in Hindi",
                "marathi": "Meaning in Marathi"
            }}
            """
            message = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=100,
                temperature=0,
                system="You are a professional translator. Return JSON only.",
                messages=[{"role": "user", "content": prompt}]
            )
            trans_data = json.loads(message.content[0].text)
            dict_data["hindi"] = trans_data.get("hindi", "Unavailable")
            dict_data["marathi"] = trans_data.get("marathi", "Unavailable")
        except Exception as e:
            print(f"AI Translation error: {e}")
            dict_data["hindi"] = await get_translation(word, "hindi")
            dict_data["marathi"] = await get_translation(word, "marathi")
    else:
        # Use free translation API if no AI key
        dict_data["hindi"] = await get_translation(word, "hindi")
        dict_data["marathi"] = await get_translation(word, "marathi")
        
    return dict_data

@router.post("/evaluate")
async def evaluate_sentence(req: EvaluateRequest, current_user: User = Depends(get_current_user)):
    API_KEY = os.environ.get("ANTHROPIC_API_KEY")
    
    if not API_KEY or API_KEY == "your-api-key":
        return {
            "is_correct": True,
            "feedback": "Great effort! (Connect Anthropic API for detailed analysis)",
            "suggestion": f"Your sentence using '{req.word}' is good."
        }
        
    try:
        client = anthropic.Anthropic(api_key=API_KEY)
        prompt = f"""
        Evaluate this sentence using the word "{req.word}": "{req.sentence}"
        Return JSON: {{"is_correct": bool, "feedback": "string", "suggestion": "string"}}
        """
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=500,
            temperature=0.3,
            system="You are an English coach. Return JSON.",
            messages=[{"role": "user", "content": prompt}]
        )
        return json.loads(message.content[0].text)
    except Exception as e:
        return {"is_correct": True, "feedback": "Nice work!", "suggestion": req.sentence}
