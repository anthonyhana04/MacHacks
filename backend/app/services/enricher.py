"""
Enrichment Service — Generates per-destination explanations and mini-itineraries
via a single batched LLM call, plus fetches POIs and media via external APIs.
"""
import json
import httpx
from google import genai
from app.config import GEMINI_API_KEY, GOOGLE_PLACES_API_KEY, YOUTUBE_API_KEY

client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
MODEL = "gemini-2.5-flash"

ENRICHMENT_PROMPT = """You are a travel expert and creative writer. Given a user's travel vibe and a list of matching destinations, generate enrichment content for each destination.

User's original prompt: "{prompt}"
Parsed vibes: {vibes}
Mood: {mood}

For each destination below, generate:
1. "why_it_matches": A 2-3 sentence explanation of why this destination matches the user's vibe. Be specific, evocative, and personal. Reference the user's original words.
2. "mini_itinerary": An array of 4-5 bullet strings describing a perfect day/visit. Be specific with neighborhoods, foods, and activities. Format each as "Time period: Activity description".
3. "neighborhood_highlight": One sentence highlighting the best neighborhood or area to explore.

Destinations:
{destinations_json}

Return JSON array in this exact format:
[
  {{
    "destination_id": "...",
    "why_it_matches": "...",
    "mini_itinerary": ["Morning: ...", "Midday: ...", "Afternoon: ...", "Evening: ..."],
    "neighborhood_highlight": "..."
  }}
]

Return ONLY the JSON array, nothing else."""


async def enrich_destinations(
    prompt: str,
    parsed_intent: dict,
    scored_destinations: list[dict],
) -> list[dict]:
    """
    Enrich scored destinations with explanations and itineraries.
    Tries LLM first, falls back to template-based generation.
    """
    destinations_info = []
    for item in scored_destinations:
        dest = item["destination"]
        destinations_info.append({
            "id": dest.id,
            "name": dest.name,
            "country": dest.country,
            "vibe_tags": [v.vibe_tag for v in dest.vibes],
            "budget_tier": dest.budget_tier,
            "vibe_description": dest.vibe_description,
        })

    # Try LLM enrichment
    if client and GEMINI_API_KEY:
        try:
            full_prompt = ENRICHMENT_PROMPT.format(
                prompt=prompt,
                vibes=parsed_intent.get("vibes", []),
                mood=parsed_intent.get("mood", "exploratory"),
                destinations_json=json.dumps(destinations_info, indent=2),
            )

            response = client.models.generate_content(
                model=MODEL,
                contents=f"You are a travel expert. Return only valid JSON.\n\n{full_prompt}",
                config=genai.types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=2000,
                    response_mime_type="application/json",
                ),
            )

            content = response.text
            enrichment_data = json.loads(content)

            if isinstance(enrichment_data, dict):
                enrichment_data = enrichment_data.get("destinations", enrichment_data.get("results", []))

            enrichment_map = {}
            if isinstance(enrichment_data, list):
                for item in enrichment_data:
                    dest_id = item.get("destination_id")
                    if dest_id:
                        enrichment_map[dest_id] = item

            if enrichment_map:
                return enrichment_map

        except Exception as e:
            print(f"LLM enrichment error, using template fallback: {e}")

    # Template-based fallback
    return _fallback_enrichment(prompt, parsed_intent, scored_destinations)


def _fallback_enrichment(prompt: str, parsed_intent: dict, scored_destinations: list[dict]) -> dict:
    """Generate enrichment from destination data without LLM."""
    vibes = parsed_intent.get("vibes", [])
    enrichment_map = {}

    for item in scored_destinations:
        dest = item["destination"]
        dest_vibes = [v.vibe_tag for v in dest.vibes]
        dest_pois = [p.poi_type for p in dest.poi_types]

        # Build "why it matches" from vibe description + tag overlap
        matching_vibes = set(vibes) & set(dest_vibes)
        vibe_str = ", ".join(list(matching_vibes)[:4]) if matching_vibes else ", ".join(dest_vibes[:3])

        why = f"{dest.name} captures the essence of what you're looking for — {dest.vibe_description.split('.')[0].lower()}."
        if matching_vibes:
            why += f" It matches your vibe for {vibe_str}."

        # Build mini-itinerary from POI types
        itinerary = _build_itinerary(dest.name, dest_pois, dest_vibes)

        # Neighborhood highlight
        neighborhood = f"Start exploring from the historic center of {dest.name} and wander through the local streets."

        enrichment_map[dest.id] = {
            "destination_id": dest.id,
            "why_it_matches": why,
            "mini_itinerary": itinerary,
            "neighborhood_highlight": neighborhood,
        }

    return enrichment_map


def _build_itinerary(name: str, poi_types: list[str], vibes: list[str]) -> list[str]:
    """Build a template itinerary from POI types."""
    itinerary = []

    morning_activities = {
        "cafe": f"Morning: Start with coffee at a local café in {name}",
        "market": f"Morning: Explore the local morning market for street food and local produce",
        "temple": f"Morning: Visit the main temple early to avoid crowds",
        "garden": f"Morning: Take a peaceful walk through the gardens",
        "tea-house": f"Morning: Begin with traditional tea at a local tea house",
        "bakery": f"Morning: Grab fresh pastries from a neighborhood bakery",
    }

    midday_activities = {
        "restaurant": f"Midday: Lunch at a locally-loved restaurant — ask for the house special",
        "market": f"Midday: Grab lunch from street food vendors at the central market",
        "museum": f"Midday: Spend time at the main museum or cultural center",
        "bookstore": f"Midday: Browse the shelves at a local independent bookshop",
        "gallery": f"Midday: Visit the local art gallery scene",
    }

    afternoon_activities = {
        "hike": f"Afternoon: Hike to a nearby viewpoint for panoramic views",
        "viewpoint": f"Afternoon: Head to a scenic viewpoint for afternoon light",
        "church": f"Afternoon: Visit the historic churches and architectural landmarks",
        "castle": f"Afternoon: Explore the castle or fortress grounds",
        "beach": f"Afternoon: Relax at a local beach or waterfront",
        "souk": f"Afternoon: Get lost in the winding streets of the old quarter",
        "ruins": f"Afternoon: Explore ancient ruins and archaeological sites",
    }

    evening_activities = {
        "bar": f"Evening: Sunset drinks at a rooftop bar with views over {name}",
        "restaurant": f"Evening: Dinner at a restaurant with outdoor seating as the city lights up",
        "pub": f"Evening: Wind down at a cozy pub with local craft drinks",
        "wine-bar": f"Evening: Sample local wines at a neighborhood wine bar",
        "night-market": f"Evening: Explore the bustling night market scene",
    }

    # Pick best match for each time slot
    for activities_map in [morning_activities, midday_activities, afternoon_activities, evening_activities]:
        added = False
        for poi in poi_types:
            if poi in activities_map:
                itinerary.append(activities_map[poi])
                added = True
                break
        if not added:
            # Fallback for this time slot
            fallback_key = list(activities_map.keys())[0]
            itinerary.append(activities_map[fallback_key])

    # Add a bonus "enjoy the vibe" item
    if vibes:
        vibe_str = " and ".join(vibes[:2])
        itinerary.append(f"Anytime: Soak in the {vibe_str} atmosphere by wandering the local neighborhoods")

    return itinerary


async def fetch_pois(
    lat: float,
    lng: float,
    poi_types: list[str] | None = None,
    limit: int = 8,
) -> list[dict]:
    """Fetch points of interest near a destination using Google Places API."""
    print(f"DEBUG: Fetching POIs for {lat}, {lng} using Key: {GOOGLE_PLACES_API_KEY[:10]}...")
    if not GOOGLE_PLACES_API_KEY:
        print("DEBUG: No API key found, returning mock POIs")
        return _mock_pois(lat, lng)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = "https://places.googleapis.com/v1/places:searchNearby"
            print(f"DEBUG: URL: {url}")
            headers = {
                "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
                "X-Goog-FieldMask": "places.displayName,places.location,places.rating,places.types,places.photos,places.id",
            }

            # Map our POI types to Google's types
            included_types = _map_poi_types(poi_types) if poi_types else [
                "restaurant", "cafe", "museum", "park", "tourist_attraction"
            ]

            body = {
                "locationRestriction": {
                    "circle": {
                        "center": {"latitude": lat, "longitude": lng},
                        "radius": 5000.0,
                    }
                },
                "includedTypes": included_types[:5],  # API limit
                "maxResultCount": limit,
                "languageCode": "en",
            }

            resp = await client.post(url, json=body, headers=headers)
            print(f"DEBUG: Google Places API Status: {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                places = data.get("places", [])
                print(f"DEBUG: Found {len(places)} places")
                
                results = []
                for p in places:
                    photo_url = None
                    photos = p.get("photos", [])
                    if photos and len(photos) > 0:
                        photo_name = photos[0].get("name")
                        if photo_name:
                            # Construct the new Google Places Photo Media URL
                            photo_url = f"https://places.googleapis.com/v1/{photo_name}/media?maxHeightPx=400&maxWidthPx=400&key={GOOGLE_PLACES_API_KEY}"

                    results.append({
                        "place_id": p.get("id", ""),
                        "name": p.get("displayName", {}).get("text", "Unknown"),
                        "type": p.get("types", ["place"])[0] if p.get("types") else "place",
                        "lat": p.get("location", {}).get("latitude", lat),
                        "lng": p.get("location", {}).get("longitude", lng),
                        "rating": p.get("rating", 0),
                        "photo_url": photo_url,
                    })
                return results
            else:
                print(f"Places API error: {resp.status_code} {resp.text}")
                return _mock_pois(lat, lng)

    except Exception as e:
        print(f"POI fetch error: {e}")
        return _mock_pois(lat, lng)


async def fetch_youtube_videos(
    destination_name: str,
    vibes: list[str] | None = None,
    limit: int = 5,
) -> list[dict]:
    """Fetch YouTube videos matching destination + vibe."""
    if not YOUTUBE_API_KEY:
        return []

    try:
        vibe_str = " ".join(vibes[:3]) if vibes else ""
        query = f"{destination_name} travel {vibe_str} walking tour"

        async with httpx.AsyncClient(timeout=10.0) as http:
            url = "https://www.googleapis.com/youtube/v3/search"
            params = {
                "part": "snippet",
                "q": query,
                "type": "video",
                "maxResults": limit,
                "order": "relevance",
                "key": YOUTUBE_API_KEY,
                "videoDuration": "medium",
                "relevanceLanguage": "en",
            }

            resp = await http.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("items", [])
                return [
                    {
                        "video_id": item["id"]["videoId"],
                        "title": item["snippet"]["title"],
                        "channel": item["snippet"]["channelTitle"],
                        "thumbnail": item["snippet"]["thumbnails"]["high"]["url"]
                        if "high" in item["snippet"].get("thumbnails", {})
                        else item["snippet"]["thumbnails"]["default"]["url"],
                    }
                    for item in items
                    if item.get("id", {}).get("videoId")
                ]
            else:
                print(f"YouTube API error: {resp.status_code}")
                return []

    except Exception as e:
        print(f"YouTube fetch error: {e}")
        return []


def _map_poi_types(poi_types: list[str]) -> list[str]:
    """Map our vibe-based POI types to Google Places API types."""
    mapping = {
        "bookstore": "book_store",
        "bookstores": "book_store",
        "cafe": "cafe",
        "cafes": "cafe",
        "coffee": "cafe",
        "restaurant": "restaurant",
        "restaurants": "restaurant",
        "temple": "hindu_temple",
        "temples": "hindu_temple",
        "shrine": "hindu_temple",
        "museum": "museum",
        "museums": "museum",
        "gallery": "art_gallery",
        "park": "park",
        "parks": "park",
        "garden": "park",
        "gardens": "park",
        "market": "shopping_mall",
        "markets": "shopping_mall",
        "beach": "natural_feature",
        "bar": "bar",
        "bars": "bar",
        "nightlife": "night_club",
    }
    result = []
    for pt in poi_types:
        mapped = mapping.get(pt.lower())
        if mapped and mapped not in result:
            result.append(mapped)
    if not result:
        result = ["restaurant", "cafe", "tourist_attraction"]
    return result


def _mock_pois(lat: float, lng: float) -> list[dict]:
    """Return mock POIs when API key is not available."""
    import random
    types = ["cafe", "restaurant", "temple", "museum", "park", "market", "bookstore"]
    names = [
        "Local Coffee House", "The Old Library", "Riverside Temple",
        "Central Market", "Heritage Museum", "Garden Walk",
        "Street Food Alley", "Artisan Quarter",
    ]
    pois = []
    for i in range(min(6, len(names))):
        pois.append({
            "place_id": f"mock_{i}",
            "name": names[i],
            "type": random.choice(types),
            "lat": lat + random.uniform(-0.02, 0.02),
            "lng": lng + random.uniform(-0.02, 0.02),
            "rating": round(random.uniform(3.8, 4.8), 1),
        })
    return pois
