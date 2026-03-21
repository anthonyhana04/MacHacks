"""
Intent Parser — Extracts structured intent from natural language.
Uses Gemini 3.1 Flash for LLM parsing, falls back to keyword-based parser.
"""
import json
import re
from google import genai
from app.config import GEMINI_API_KEY

client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
MODEL = "gemini-2.5-flash"

SYSTEM_PROMPT = """You are a travel intent parser. Given a user's natural language travel desire,
extract structured intent as JSON. Be liberal in interpretation — users are vague.

Output this exact JSON schema:
{
  "anchor": { "name": string | null, "country": string | null },
  "vibes": string[],
  "negations": string[],
  "constraints": {
    "budget": "budget" | "mid" | "luxury" | null,
    "season": string | null,
    "trip_length_days": number | null,
    "must_be_country": string | null,
    "must_be_continent": string | null,
    "warmer_than_anchor": boolean | null,
    "cooler_than_anchor": boolean | null,
    "cheaper_than_anchor": boolean | null
  },
  "poi_preferences": string[],
  "mood": string | null
}

Rules:
- If no anchor location is mentioned, set anchor to {"name": null, "country": null}
- Extract vibes generously — "Italy vibes" → ["mediterranean", "historic", "romantic", "good-food"]
- "less touristy" → negation: ["touristy"]
- "but canada" or "in canada" → constraints.must_be_country: "Canada"
- "in asia" → constraints.must_be_continent: "Asia"
- "cheaper" implies budget constraint relative to anchor
- Always return valid JSON, nothing else"""


def parse_intent(prompt: str) -> dict:
    """Parse a natural language travel prompt into structured intent."""
    # Try LLM first
    if client and GEMINI_API_KEY:
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=f"{SYSTEM_PROMPT}\n\nUser prompt: {prompt}",
                config=genai.types.GenerateContentConfig(
                    temperature=0.3,
                    max_output_tokens=500,
                    response_mime_type="application/json",
                ),
            )
            content = response.text
            parsed = json.loads(content)
            return _normalize_intent(parsed)
        except Exception as e:
            print(f"LLM intent parsing failed, using keyword parser: {e}")

    # Keyword-based fallback
    return _keyword_parse(prompt)


# --- Known locations for keyword matching ---
KNOWN_CITIES = {
    "kyoto": ("Kyoto", "Japan"),
    "tokyo": ("Tokyo", "Japan"),
    "osaka": ("Osaka", "Japan"),
    "porto": ("Porto", "Portugal"),
    "lisbon": ("Lisbon", "Portugal"),
    "barcelona": ("Barcelona", "Spain"),
    "paris": ("Paris", "France"),
    "rome": ("Rome", "Italy"),
    "florence": ("Florence", "Italy"),
    "venice": ("Venice", "Italy"),
    "naples": ("Naples", "Italy"),
    "istanbul": ("Istanbul", "Turkey"),
    "marrakech": ("Marrakech", "Morocco"),
    "prague": ("Prague", "Czech Republic"),
    "budapest": ("Budapest", "Hungary"),
    "edinburgh": ("Edinburgh", "United Kingdom"),
    "london": ("London", "United Kingdom"),
    "amsterdam": ("Amsterdam", "Netherlands"),
    "bruges": ("Bruges", "Belgium"),
    "ghent": ("Ghent", "Belgium"),
    "tbilisi": ("Tbilisi", "Georgia"),
    "bangkok": ("Bangkok", "Thailand"),
    "chiang mai": ("Chiang Mai", "Thailand"),
    "hoi an": ("Hoi An", "Vietnam"),
    "bali": ("Bali", "Indonesia"),
    "seoul": ("Seoul", "South Korea"),
    "taipei": ("Taipei", "Taiwan"),
    "singapore": ("Singapore", "Singapore"),
    "oaxaca": ("Oaxaca", "Mexico"),
    "mexico city": ("Mexico City", "Mexico"),
    "cartagena": ("Cartagena", "Colombia"),
    "medellin": ("Medellín", "Colombia"),
    "cusco": ("Cusco", "Peru"),
    "buenos aires": ("Buenos Aires", "Argentina"),
    "dubrovnik": ("Dubrovnik", "Croatia"),
    "kotor": ("Kotor", "Montenegro"),
    "bergen": ("Bergen", "Norway"),
    "stockholm": ("Stockholm", "Sweden"),
    "copenhagen": ("Copenhagen", "Denmark"),
}

KNOWN_COUNTRIES = {
    "japan": "Japan", "italy": "Italy", "france": "France", "spain": "Spain",
    "portugal": "Portugal", "morocco": "Morocco", "turkey": "Turkey",
    "greece": "Greece", "mexico": "Mexico", "thailand": "Thailand",
    "vietnam": "Vietnam", "india": "India", "peru": "Peru",
    "colombia": "Colombia", "croatia": "Croatia", "norway": "Norway",
    "sweden": "Sweden", "indonesia": "Indonesia", "korea": "South Korea",
}

# Vibe keywords and their expanded tags
VIBE_EXPANSIONS = {
    "cozy": ["cozy", "warm", "intimate"],
    "rainy": ["rainy", "moody", "atmospheric"],
    "bookish": ["bookish", "literary", "bookstore"],
    "literary": ["literary", "bookish", "historic"],
    "romantic": ["romantic", "intimate", "photogenic"],
    "quiet": ["quiet", "peaceful", "slow"],
    "peaceful": ["peaceful", "quiet", "zen"],
    "historic": ["historic", "old-town", "ancient"],
    "old": ["old-town", "historic", "cobblestone"],
    "ancient": ["ancient", "historic", "ruins"],
    "cheap": ["cheap", "budget", "affordable"],
    "affordable": ["affordable", "cheap", "budget"],
    "warm": ["warm", "sunny", "tropical"],
    "cold": ["cold", "cool", "nordic"],
    "colorful": ["colorful", "photogenic", "vibrant"],
    "vibrant": ["vibrant", "lively", "colorful"],
    "exotic": ["exotic", "unique", "cultural"],
    "spiritual": ["spiritual", "zen", "temple"],
    "zen": ["zen", "spiritual", "meditative"],
    "bohemian": ["bohemian", "artistic", "creative"],
    "artistic": ["artistic", "creative", "gallery"],
    "foodie": ["foodie", "street-food", "culinary"],
    "walkable": ["walkable", "compact", "pedestrian"],
    "coastal": ["coastal", "beach", "ocean"],
    "mountain": ["mountain", "alpine", "highland"],
    "medieval": ["medieval", "castle", "cobblestone"],
    "gothic": ["gothic", "dark-academia", "moody"],
    "photogenic": ["photogenic", "instagram", "colorful"],
    "underrated": ["underrated", "off-beaten-path", "hidden-gem"],
}

# Country-level vibe expansions
COUNTRY_VIBES = {
    "italy": ["mediterranean", "historic", "romantic", "good-food", "wine", "warm"],
    "japan": ["zen", "traditional", "temple", "refined", "quiet", "cherry-blossom"],
    "france": ["romantic", "wine", "cuisine", "elegant", "historic", "cafe"],
    "morocco": ["exotic", "spice", "medina", "colorful", "warm", "souk"],
    "portugal": ["tiled", "melancholic", "fado", "historic", "coastal", "wine"],
    "spain": ["warm", "tapas", "flamenco", "historic", "lively", "mediterranean"],
    "greece": ["mediterranean", "island", "sunny", "ancient", "blue", "white"],
    "thailand": ["tropical", "temple", "street-food", "warm", "cheap", "friendly"],
    "mexico": ["colorful", "street-food", "colonial", "warm", "artistic", "mezcal"],
}

NEGATION_TRIGGERS = {
    "touristy": "touristy", "crowded": "crowded", "busy": "crowded",
    "expensive": "expensive", "noisy": "noisy", "loud": "noisy",
    "modern": "modern", "generic": "generic", "mainstream": "touristy",
    "overrated": "touristy", "commercial": "commercial",
}

POI_KEYWORDS = {
    "bookstore": "bookstore", "bookstores": "bookstore", "books": "bookstore", "bookshop": "bookstore",
    "cafe": "cafe", "cafes": "cafe", "coffee": "cafe",
    "temple": "temple", "temples": "temple", "shrine": "temple",
    "restaurant": "restaurant", "restaurants": "restaurant", "food": "restaurant",
    "museum": "museum", "museums": "museum", "gallery": "gallery",
    "market": "market", "markets": "market", "souk": "market",
    "beach": "beach", "beaches": "beach",
    "bar": "bar", "bars": "bar", "pub": "pub", "pubs": "pub",
    "park": "park", "garden": "garden",
    "church": "church", "cathedral": "church",
    "castle": "castle", "fortress": "castle",
}

MOOD_KEYWORDS = {
    "contemplative": "contemplative", "melancholic": "melancholic", "sad": "melancholic",
    "adventurous": "adventurous", "exciting": "adventurous",
    "relaxed": "relaxed", "relaxing": "relaxed", "chill": "relaxed",
    "romantic": "romantic", "dreamy": "dreamy",
    "mysterious": "mysterious", "magical": "mystical",
    "nostalgic": "nostalgic", "wistful": "nostalgic",
}


def _keyword_parse(prompt: str) -> dict:
    """Smart keyword-based intent extraction."""
    text = prompt.lower().strip()

    # 1. Extract anchor location
    anchor_name = None
    anchor_country = None

    # Check for "like X" or "similar to X" patterns
    like_match = re.search(r'(?:like|similar to|reminds? me of)\s+([a-z\s]+?)(?:\s+but|\s*,|\s+with|$)', text)
    if like_match:
        candidate = like_match.group(1).strip()
        for key, (name, country) in KNOWN_CITIES.items():
            if key in candidate:
                anchor_name = name
                anchor_country = country
                break

    # Check for "X vibes" pattern
    if not anchor_name:
        vibe_match = re.search(r'([a-z\s]+?)\s+vibes?', text)
        if vibe_match:
            candidate = vibe_match.group(1).strip()
            for key, country in KNOWN_COUNTRIES.items():
                if key in candidate:
                    anchor_country = country
                    break
            if not anchor_country:
                for key, (name, country) in KNOWN_CITIES.items():
                    if key in candidate:
                        anchor_name = name
                        anchor_country = country
                        break

    # Check for "not X" pattern (exclude a destination)
    if not anchor_name:
        not_match = re.search(r'not\s+([a-z\s]+?)(?:\s*,|\s*$)', text)
        if not_match:
            candidate = not_match.group(1).strip()
            for key, (name, country) in KNOWN_CITIES.items():
                if key in candidate:
                    break

    # If no "like X" pattern, check if any city is just mentioned
    if not anchor_name and not anchor_country:
        for key, (name, country) in KNOWN_CITIES.items():
            if key in text:
                anchor_name = name
                anchor_country = country
                break
        if not anchor_name:
            for key, country in KNOWN_COUNTRIES.items():
                if key in text:
                    anchor_country = country
                    break

    # 2. Extract vibes
    vibes = set()
    words = re.findall(r'[a-z]+(?:-[a-z]+)*', text)

    for word in words:
        if word in VIBE_EXPANSIONS:
            vibes.update(VIBE_EXPANSIONS[word])
        elif len(word) > 3 and word not in {
            "want", "like", "somewhere", "with", "that", "have", "been",
            "going", "place", "where", "there", "from", "some", "this",
            "just", "really", "very", "more", "less", "than", "about",
            "would", "could", "should", "also", "still", "into", "find",
            "looking", "thinking", "give", "vibes", "feel", "feels",
        }:
            vibes.add(word)

    # Add country-level vibes if anchor is a country
    if anchor_country:
        country_key = anchor_country.lower()
        if country_key in COUNTRY_VIBES:
            vibes.update(COUNTRY_VIBES[country_key])

    # 3. Extract negations
    negations = set()
    neg_patterns = re.findall(r'(?:less|not|without|no)\s+([a-z]+)', text)
    for neg_word in neg_patterns:
        if neg_word in NEGATION_TRIGGERS:
            negations.add(NEGATION_TRIGGERS[neg_word])
        else:
            negations.add(neg_word)

    but_match = re.search(r'but\s+(.+?)(?:\.|$)', text)
    if but_match:
        but_text = but_match.group(1)
        for word, neg in NEGATION_TRIGGERS.items():
            if word in but_text:
                negations.add(neg)

    # 4. Extract constraints
    constraints = {
        "budget": None, "season": None, "trip_length_days": None,
        "warmer_than_anchor": None, "cooler_than_anchor": None,
        "cheaper_than_anchor": None,
    }

    if any(w in text for w in ["cheap", "budget", "affordable", "inexpensive"]):
        constraints["budget"] = "budget"
    if any(w in text for w in ["cheaper"]):
        constraints["cheaper_than_anchor"] = True
    if any(w in text for w in ["warmer", "hotter", "sunnier"]):
        constraints["warmer_than_anchor"] = True
    if any(w in text for w in ["cooler", "colder"]):
        constraints["cooler_than_anchor"] = True

    # 5. Extract POI preferences
    pois = set()
    for word in words:
        if word in POI_KEYWORDS:
            pois.add(POI_KEYWORDS[word])

    # 6. Detect mood
    mood = None
    for word in words:
        if word in MOOD_KEYWORDS:
            mood = MOOD_KEYWORDS[word]
            break

    if not mood:
        if vibes & {"rainy", "moody", "melancholic", "gothic"}:
            mood = "melancholic"
        elif vibes & {"cozy", "quiet", "peaceful", "zen"}:
            mood = "contemplative"
        elif vibes & {"vibrant", "lively", "colorful", "energetic"}:
            mood = "adventurous"
        elif vibes & {"romantic", "intimate"}:
            mood = "romantic"

    vibes -= {anchor_name.lower() if anchor_name else "", anchor_country.lower() if anchor_country else ""}
    vibes -= {""}

    return {
        "anchor": {"name": anchor_name, "country": anchor_country},
        "vibes": list(vibes)[:12],
        "negations": list(negations),
        "constraints": constraints,
        "poi_preferences": list(pois),
        "mood": mood,
    }


def _normalize_intent(parsed: dict) -> dict:
    """Ensure all expected fields exist with correct types."""
    anchor = parsed.get("anchor", {})
    if anchor is None:
        anchor = {}

    constraints = parsed.get("constraints", {})
    if constraints is None:
        constraints = {}

    return {
        "anchor": {
            "name": anchor.get("name"),
            "country": anchor.get("country"),
        },
        "vibes": parsed.get("vibes", []),
        "negations": parsed.get("negations", []),
        "constraints": {
            "budget": constraints.get("budget"),
            "season": constraints.get("season"),
            "trip_length_days": constraints.get("trip_length_days"),
            "must_be_country": constraints.get("must_be_country"),
            "must_be_continent": constraints.get("must_be_continent"),
            "warmer_than_anchor": constraints.get("warmer_than_anchor"),
            "cooler_than_anchor": constraints.get("cooler_than_anchor"),
            "cheaper_than_anchor": constraints.get("cheaper_than_anchor"),
        },
        "poi_preferences": parsed.get("poi_preferences", []),
        "mood": parsed.get("mood"),
    }
