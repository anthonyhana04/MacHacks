import os
import sys
import json
import time
from pydantic import BaseModel
from google import genai
from typing import List

# Setup paths
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from app.config import GEMINI_API_KEY

DESTINATIONS_FILE = os.path.join(os.path.dirname(__file__), "destinations.json")

# Define schema for structured output
class AvgTemps(BaseModel):
    jan: int
    apr: int
    jul: int
    oct: int

class DestinationMeta(BaseModel):
    id: str
    name: str
    country: str
    region: str
    continent: str
    lat: float
    lng: float
    budget_tier: str
    tourism_level: str
    best_seasons: List[str]
    avg_temps: AvgTemps
    vibe_description: str
    hero_image_url: str
    similar_to: List[str]
    vibes: List[str]
    negations: List[str]
    poi_types: List[str]

class DestinationList(BaseModel):
    destinations: List[DestinationMeta]

def generate_batch(existing_names: set, client: genai.Client, batch_size: int = 20):
    prompt = f"""
    You are an expert travel curator. Generate a list of {batch_size} unique, distinct, and diverse travel destinations from around the world.
    They can be cities, regions, or specific towns.
    
    CRITICAL: Do not include ANY of the following destinations as they already exist in our database:
    {', '.join(list(existing_names))}

    Guidelines constraints:
    - Include diverse continents: Africa, Asia, Europe, North America, South America, Oceania.
    - Give a mix of well-known hubs and hidden gems.
    - id: lowercase, hyphenated (e.g. "paris-france").
    - lat and lng: approximately correct decimal degrees.
    - budget_tier: "budget", "mid", or "luxury".
    - tourism_level: "low", "moderate", or "high". 
    - best_seasons: list of 3-letter lowercase months (e.g. "jan", "feb").
    - vibe_description: vivid, sensory description of what it feels like (2-3 sentences).
    - hero_image_url: use a placeholder like "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800"
    - similar_to: 2-3 ids of similar places (they can be places already in the database or new ones).
    - vibes: 8-12 evocative tags (e.g. "romantic", "rainy", "cyberpunk", "ancient", "foodie").
    - negations: 2-4 things it is NOT (e.g. "cheap", "beach", "party", "modern").
    - poi_types: 5-8 google places types (e.g. "cafe", "museum", "temple", "bar", "park").
    """

    try:
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite-preview',
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=DestinationList,
                temperature=0.9,
            ),
        )
        return json.loads(response.text)["destinations"]
    except Exception as e:
        print(f"Error calling Gemini: {e}")
        return []

def main():
    if not GEMINI_API_KEY:
        print("GEMINI_API_KEY not found in config.")
        return

    client = genai.Client(api_key=GEMINI_API_KEY)

    with open(DESTINATIONS_FILE, 'r') as f:
        destinations = json.load(f)

    existing_names = {d["name"] for d in destinations}
    total_needed = 200
    batch_size = 20
    batches = total_needed // batch_size

    print(f"Currently have {len(destinations)} destinations.")
    print(f"Generating {total_needed} more in {batches} batches...")

    for i in range(batches):
        print(f"Generating batch {i+1}/{batches}...")
        new_dests = generate_batch(existing_names, client, batch_size)
        
        valid_new = [d for d in new_dests if d["name"] not in existing_names]
        
        for d in valid_new:
            existing_names.add(d["name"])
            destinations.append(d)
            
        print(f"  Added {len(valid_new)} destinations. Total so far: {len(destinations)}")
        
        # Save after every batch
        with open(DESTINATIONS_FILE, 'w') as f:
            json.dump(destinations, f, indent=2, ensure_ascii=False)
            
        time.sleep(2) # rate limit prevention

    print(f"\\nDone! Total destinations: {len(destinations)}")

if __name__ == "__main__":
    main()
