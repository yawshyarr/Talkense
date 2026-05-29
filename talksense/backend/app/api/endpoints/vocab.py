from fastapi import APIRouter, Depends
import anthropic
import os
import json
import httpx
import re
from pydantic import BaseModel

from .auth import get_current_user
from ...models.domain import User

router = APIRouter()


class SearchRequest(BaseModel):
    word: str


class EvaluateRequest(BaseModel):
    word: str
    sentence: str


CURATED_WORD_BANK = {
    "eloquent": {
        "definition": "Fluent, persuasive, and graceful in speaking or writing.",
        "synonyms": ["articulate", "expressive", "persuasive", "fluent"],
        "antonyms": ["inarticulate", "unclear", "hesitant", "awkward"],
        "examples": [
            "Her eloquent presentation kept the entire audience engaged.",
            "He gave an eloquent answer that was both clear and persuasive.",
            "The speaker was eloquent without sounding overly rehearsed.",
        ],
    },
    "resilience": {
        "definition": "The ability to recover quickly from difficulty or adapt under pressure.",
        "synonyms": ["toughness", "adaptability", "endurance", "grit"],
        "antonyms": ["fragility", "weakness", "instability", "vulnerability"],
        "examples": [
            "The team showed resilience after the project setbacks.",
            "Emotional resilience helps professionals perform under stress.",
            "Her resilience was visible in the way she handled criticism.",
        ],
    },
    "pragmatic": {
        "definition": "Focused on practical results rather than theory alone.",
        "synonyms": ["practical", "realistic", "sensible", "grounded"],
        "antonyms": ["idealistic", "impractical", "dreamy", "theoretical"],
        "examples": [
            "We took a pragmatic approach to solving the client issue.",
            "His pragmatic advice helped the team act quickly.",
            "A pragmatic leader balances ambition with feasibility.",
        ],
    },
    "ubiquitous": {
        "definition": "Present or appearing everywhere.",
        "synonyms": ["widespread", "universal", "common", "pervasive"],
        "antonyms": ["rare", "scarce", "uncommon", "isolated"],
        "examples": [
            "Smartphones are now ubiquitous in modern workplaces.",
            "The brand became ubiquitous after years of expansion.",
            "Social media is so ubiquitous that it shapes daily communication.",
        ],
    },
}


def normalize_list(values):
    cleaned = []
    seen = set()
    for value in values:
        item = re.sub(r"\s+", " ", str(value or "").strip())
        key = item.lower()
        if not item or key in seen:
            continue
        seen.add(key)
        cleaned.append(item)
    return cleaned


def looks_like_example(example: str, word: str) -> bool:
    text = (example or "").strip()
    if len(text.split()) < 5:
        return False
    if text.lower().count(word.lower()) > 2:
        return False
    return True


async def get_google_translation(text: str, target_lang: str):
    lang_code = "hi" if target_lang == "hindi" else "mr"

    try:
        url = "https://translate.googleapis.com/translate_a/single"
        params = {
            "client": "gtx",
            "sl": "en",
            "tl": lang_code,
            "dt": "t",
            "q": text,
        }
        headers = {
            "User-Agent": "Mozilla/5.0"
        }
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, headers=headers, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                return data[0][0][0]
    except Exception as exc:
        print(f"Google Translate error ({target_lang}): {exc}")

    try:
        encoded_text = httpx.QueryParams({"q": text}).get("q", text)
        url = f"https://api.mymemory.translated.net/get?q={encoded_text}&langpair=en|{lang_code}"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=5.0)
            if response.status_code == 200:
                return response.json()["responseData"]["translatedText"]
    except Exception as exc:
        print(f"Fallback translation error ({target_lang}): {exc}")

    return "Translation unavailable"


def build_local_word_data(word: str):
    word_lower = word.lower()
    curated = CURATED_WORD_BANK.get(word_lower)
    if curated:
        return {
            "word": word_lower,
            "definition": curated["definition"],
            "synonyms": curated["synonyms"],
            "antonyms": curated["antonyms"],
            "examples": curated["examples"],
        }

    readable = word_lower.replace("-", " ")
    return {
        "word": word_lower,
        "definition": f"'{word_lower}' is a vocabulary term used in English communication. Review its context carefully before using it in formal speech.",
        "synonyms": [f"related to {readable}", f"{readable} in context", f"{readable} in meaning"],
        "antonyms": [f"not {readable}", f"opposite of {readable}", f"contrasting {readable}"],
        "examples": [
            f"The coach asked the speaker to use '{word_lower}' in a clear professional sentence.",
            f"Understanding the context of '{word_lower}' helps you use it more accurately.",
            f"A strong sentence with '{word_lower}' should sound natural, specific, and grammatically complete.",
        ],
    }


async def get_pro_dictionary_data(word: str):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}", timeout=10.0)
            if response.status_code == 200:
                data = response.json()[0]

                definition = "Definition not found."
                for meaning in data.get("meanings", []):
                    definitions = meaning.get("definitions", [])
                    if definitions:
                        definition = definitions[0].get("definition", definition)
                        break

                synonyms = []
                antonyms = []
                examples = []
                for meaning in data.get("meanings", []):
                    synonyms.extend(meaning.get("synonyms", []))
                    antonyms.extend(meaning.get("antonyms", []))
                    for item in meaning.get("definitions", []):
                        synonyms.extend(item.get("synonyms", []))
                        antonyms.extend(item.get("antonyms", []))
                        example = item.get("example")
                        if example and looks_like_example(example, word):
                            examples.append(example)

                synonyms = [item.lower() for item in normalize_list(synonyms) if item.lower() != word.lower()][:6]
                antonyms = [item.lower() for item in normalize_list(antonyms) if item.lower() != word.lower() and item.lower() not in synonyms][:6]
                examples = normalize_list(examples)[:4]

                fallback = build_local_word_data(word)
                return {
                    "word": word.lower(),
                    "definition": definition,
                    "synonyms": synonyms or fallback["synonyms"],
                    "antonyms": antonyms or fallback["antonyms"],
                    "examples": examples or fallback["examples"],
                }
    except Exception as exc:
        print(f"Dictionary API error: {exc}")

    return build_local_word_data(word)


def evaluate_sentence_locally(word: str, sentence: str):
    clean_sentence = re.sub(r"\s+", " ", sentence.strip())
    lowered = clean_sentence.lower()
    word_lower = word.lower().strip()
    issues = []
    suggestions = []
    score = 100

    if word_lower not in re.findall(r"\b[\w'-]+\b", lowered):
        issues.append(f"The sentence does not use the target word '{word_lower}' exactly.")
        suggestions.append(f"Write a sentence that includes '{word_lower}' naturally.")
        score -= 45

    tokens = re.findall(r"\b[\w'-]+\b", clean_sentence)
    if len(tokens) < 5:
        issues.append("The sentence is too short to show clear meaning.")
        suggestions.append("Try writing at least 8 to 12 words so the meaning is easier to judge.")
        score -= 20

    if clean_sentence and not clean_sentence[0].isupper():
        issues.append("The sentence should start with a capital letter.")
        suggestions.append("Start the sentence with a capital letter.")
        score -= 8

    if clean_sentence and clean_sentence[-1] not in ".!?":
        issues.append("The sentence should end with punctuation.")
        suggestions.append("Finish the sentence with a period, question mark, or exclamation mark.")
        score -= 8

    repeated_word_count = lowered.split().count(word_lower)
    if repeated_word_count > 1:
        issues.append(f"The target word appears {repeated_word_count} times, which makes the sentence sound forced.")
        suggestions.append(f"Use '{word_lower}' once in a natural context.")
        score -= 10

    if re.search(rf"\b{re.escape(word_lower)}\b\s+\b{re.escape(word_lower)}\b", lowered):
        issues.append("The word is repeated back-to-back, which is incorrect usage.")
        suggestions.append("Remove the repeated target word.")
        score -= 20

    if word_lower in {"eloquent", "pragmatic", "ubiquitous", "resilience"}:
        semantic_checks = {
            "eloquent": ["speaker", "speech", "answer", "presentation", "talk", "argument", "response"],
            "pragmatic": ["solution", "approach", "decision", "plan", "strategy", "response"],
            "ubiquitous": ["everywhere", "common", "society", "daily", "modern", "world", "workplace"],
            "resilience": ["difficulty", "stress", "pressure", "recovery", "setback", "challenge", "failure"],
        }
        if not any(context in lowered for context in semantic_checks[word_lower]):
            issues.append(f"The sentence uses '{word_lower}' but the context is weak or unclear.")
            suggestions.append(f"Place '{word_lower}' in a sentence that makes its meaning obvious.")
            score -= 12

    is_correct = score >= 70 and not any("does not use" in issue for issue in issues)
    feedback = (
        "The sentence uses the word naturally and clearly."
        if is_correct
        else "The sentence needs adjustment before the word is being used confidently."
    )
    suggestion = suggestions[0] if suggestions else f"Good job. Keep using '{word_lower}' in varied contexts."

    return {
        "is_correct": is_correct,
        "score": max(0, score),
        "feedback": feedback,
        "suggestion": suggestion,
        "issues": issues,
    }


@router.post("/search")
async def search_word(req: SearchRequest, current_user: User = Depends(get_current_user)):
    word = req.word.strip().lower()
    dict_data = await get_pro_dictionary_data(word)
    dict_data["hindi"] = await get_google_translation(word, "hindi")
    dict_data["marathi"] = await get_google_translation(word, "marathi")
    return dict_data


@router.post("/evaluate")
async def evaluate_sentence(req: EvaluateRequest, current_user: User = Depends(get_current_user)):
    local_result = evaluate_sentence_locally(req.word, req.sentence)
    api_key = os.environ.get("ANTHROPIC_API_KEY")

    if not api_key or api_key == "your-api-key":
        return local_result

    try:
        client = anthropic.Anthropic(api_key=api_key)
        prompt = f"""
        Evaluate this sentence for the target word.
        Word: "{req.word}"
        Sentence: "{req.sentence}"

        Return only JSON with:
        {{
          "is_correct": boolean,
          "score": integer 0-100,
          "feedback": "short explanation",
          "suggestion": "improved sentence or direct advice",
          "issues": ["issue 1", "issue 2"]
        }}
        """
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=350,
            temperature=0,
            system="You are an English vocabulary coach. Judge sentence correctness carefully and return strict JSON only.",
            messages=[{"role": "user", "content": prompt}],
        )
        ai_result = json.loads(message.content[0].text)
        if not isinstance(ai_result.get("issues"), list):
            ai_result["issues"] = []
        return ai_result
    except Exception as exc:
        print(f"Sentence evaluation fallback triggered: {exc}")
        return local_result
