import json
import uuid
from typing import List, Optional
from google import genai
from pydantic import BaseModel

from app.config import GEMINI_API_KEY

client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
MODEL = "gemini-3.1-flash-lite-preview"

class DynamicDestination(BaseModel):
    id: str
    name: str
    country: str
    region: str
    lat: float
    lng: float
    budget_tier: str
    best_seasons: List[str]
    vibe_tags: List[str]
    match_score: float
    hero_image_url: Optional[str] = None
    poi_types: List[str] = ["landmark", "restaurant", "cafe", "museum", "park"]

SYSTEM_PROMPT = """You are an expert AI travel agent. Given a user's prompt and parsed intent, 
recommend exactly 3 real-world cities or regions that perfectly match the request. 

CRITICAL RULES:
1. NEVER recommend fast food. When suggesting `poi_types`, always focus on highly-rated popular tourist spots, authentic local restaurants, and major cultural landmarks.
2. Be highly realistic with timelines and expectations.

Return ONLY a JSON object exactly matching this format:
{
  "destinations": [
    {
      "name": "City Name",
      "country": "Country",
      "region": "State/Province/Region",
      "lat": 12.345,
      "lng": -45.678,
      "budget_tier": "$$" (use $, $$, or $$$),
      "best_seasons": ["Spring", "Fall"],
      "vibe_tags": ["Architecture", "Romantic", "Food"],
      "match_score": 95 (integer 0-100 indicating confidence)
    }
  ]
}
"""

async def generate_realtime_destinations(prompt: str, intent: dict) -> List[dict]:
    if not client:
        print("GEMINI_API_KEY is not set.")
        return []
    
    prompt_text = f"User Prompt: {prompt}\nParsed Intent: {json.dumps(intent)}"
    
    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=f"{SYSTEM_PROMPT}\n\n{prompt_text}",
            config=genai.types.GenerateContentConfig(
                temperature=0.7,
                response_mime_type="application/json",
            ),
        )
        data = json.loads(response.text)
        destinations = []
        for d in data.get("destinations", [])[:3]:
            # Construct a dynamic destination object
            dest = DynamicDestination(
                id=f"dyn_{uuid.uuid4().hex[:8]}",
                name=d.get("name", "Unknown"),
                country=d.get("country", ""),
                region=d.get("region", ""),
                lat=d.get("lat", 0.0),
                lng=d.get("lng", 0.0),
                budget_tier=d.get("budget_tier", "$$"),
                best_seasons=d.get("best_seasons", []),
                vibe_tags=d.get("vibe_tags", []),
                match_score=float(d.get("match_score", 90))
            )
            destinations.append({"destination": dest, "score": dest.match_score})
        return destinations
    except Exception as e:
        print(f"Failed to generate realtime destinations: {e}")
        return []
