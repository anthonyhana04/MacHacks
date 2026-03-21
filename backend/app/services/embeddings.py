"""
Embedding Service — Generates vibe embeddings via Gemini.
"""
from google import genai
from app.config import GEMINI_API_KEY

client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
EMBEDDING_MODEL = "gemini-embedding-001"


def generate_embedding(text: str) -> list[float]:
    """Generate an embedding for a text string using Gemini."""
    if not client:
        return []
    try:
        response = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=text,
        )
        return list(response.embeddings[0].values)
    except Exception as e:
        print(f"Embedding generation error: {e}")
        return []


def generate_query_embedding(parsed_intent: dict) -> list[float]:
    """Generate an embedding from parsed intent for similarity comparison."""
    parts = []

    vibes = parsed_intent.get("vibes", [])
    if vibes:
        parts.append("Vibes: " + ", ".join(vibes))

    mood = parsed_intent.get("mood")
    if mood:
        parts.append(f"Mood: {mood}")

    pois = parsed_intent.get("poi_preferences", [])
    if pois:
        parts.append("Interests: " + ", ".join(pois))

    anchor = parsed_intent.get("anchor", {})
    if anchor and anchor.get("name"):
        parts.append(f"Similar to: {anchor['name']}")

    if not parts:
        return []

    query_text = ". ".join(parts)
    return generate_embedding(query_text)
