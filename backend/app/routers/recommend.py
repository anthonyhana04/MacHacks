"""
Main API router — /api/recommend endpoint (full pipeline).
"""
import hashlib
import time
import asyncio
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Destination, ResponseCache, QueryLog
from app.services.parser import parse_intent
from app.services.ranker import rank_destinations
from app.services.enricher import enrich_destinations, fetch_pois, fetch_youtube_videos
from app.services.embeddings import generate_query_embedding

router = APIRouter()


class RecommendRequest(BaseModel):
    prompt: str


class DestinationResponse(BaseModel):
    id: str
    name: str
    country: str
    region: str
    match_score: float
    hero_image_url: str | None
    budget_tier: str
    best_seasons: list[str]
    coordinates: dict
    vibe_tags: list[str]
    why_it_matches: str
    mini_itinerary: list[str]
    neighborhood_highlight: str
    pois: list[dict]
    media: list[dict]


class RecommendResponse(BaseModel):
    parsed_intent: dict
    destinations: list[dict]
    meta: dict


@router.post("/recommend", response_model=RecommendResponse)
async def recommend(req: RecommendRequest, db: Session = Depends(get_db)):
    start_time = time.time()

    if not req.prompt or len(req.prompt.strip()) < 3:
        raise HTTPException(status_code=400, detail="Prompt must be at least 3 characters")

    prompt = req.prompt.strip()

    # Step 1: Check cache
    prompt_hash = hashlib.sha256(prompt.lower().encode()).hexdigest()
    cached = db.query(ResponseCache).filter(ResponseCache.prompt_hash == prompt_hash).first()

    if cached:
        # Check TTL
        created = cached.created_at
        if created and (datetime.now(timezone.utc) - created) < timedelta(hours=cached.ttl_hours or 24):
            elapsed = int((time.time() - start_time) * 1000)
            response = cached.response
            response["meta"] = {"response_ms": elapsed, "cached": True}
            return response

    # Step 2: Parse intent (LLM call #1)
    parsed_intent = parse_intent(prompt)

    # Step 3: Generate query embedding
    query_embedding = generate_query_embedding(parsed_intent)

    # Step 4: Rank destinations (algorithmic — no LLM)
    scored_destinations = rank_destinations(
        db=db,
        parsed_intent=parsed_intent,
        query_embedding=query_embedding if query_embedding else None,
        top_k=5,
    )

    if not scored_destinations:
        elapsed = int((time.time() - start_time) * 1000)
        return {
            "parsed_intent": parsed_intent,
            "destinations": [],
            "meta": {"response_ms": elapsed, "cached": False},
        }

    # Step 5: Enrich (LLM call #2 + API calls — in parallel)
    enrichment_map, pois_map, media_map = await _enrich_parallel(
        prompt, parsed_intent, scored_destinations
    )

    # Step 6: Assemble response
    destinations_response = []
    for item in scored_destinations:
        dest = item["destination"]
        dest_id = dest.id

        enrichment = enrichment_map.get(dest_id, {})
        pois = pois_map.get(dest_id, [])
        media = media_map.get(dest_id, [])

        destinations_response.append({
            "id": dest.id,
            "name": dest.name,
            "country": dest.country,
            "region": dest.region,
            "match_score": item["score"],
            "hero_image_url": dest.hero_image_url,
            "budget_tier": dest.budget_tier,
            "best_seasons": dest.best_seasons or [],
            "coordinates": {"lat": dest.lat, "lng": dest.lng},
            "vibe_tags": [v.vibe_tag for v in dest.vibes],
            "why_it_matches": enrichment.get("why_it_matches", f"{dest.name} matches your vibe."),
            "mini_itinerary": enrichment.get("mini_itinerary", []),
            "neighborhood_highlight": enrichment.get("neighborhood_highlight", ""),
            "pois": pois,
            "media": media,
        })

    elapsed = int((time.time() - start_time) * 1000)

    response = {
        "parsed_intent": parsed_intent,
        "destinations": destinations_response,
        "meta": {"response_ms": elapsed, "cached": False},
    }

    # Step 7: Cache the response
    try:
        cache_entry = ResponseCache(
            prompt_hash=prompt_hash,
            response=response,
            ttl_hours=24,
        )
        db.merge(cache_entry)
        db.commit()
    except Exception as e:
        print(f"Cache write error: {e}")
        db.rollback()

    # Step 8: Log the query
    try:
        log_entry = QueryLog(
            raw_prompt=prompt,
            parsed_intent=parsed_intent,
            top_results=[d["id"] for d in destinations_response],
            response_ms=elapsed,
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        print(f"Query log error: {e}")
        db.rollback()

    return response


async def _enrich_parallel(prompt, parsed_intent, scored_destinations):
    """Run enrichment LLM call, POI fetches, and media fetches in parallel."""
    vibes = parsed_intent.get("vibes", [])
    poi_prefs = parsed_intent.get("poi_preferences", [])

    # Start all async tasks
    enrichment_task = enrich_destinations(prompt, parsed_intent, scored_destinations)

    poi_tasks = {}
    media_tasks = {}
    for item in scored_destinations:
        dest = item["destination"]
        poi_tasks[dest.id] = fetch_pois(dest.lat, dest.lng, poi_prefs or None, limit=6)
        media_tasks[dest.id] = fetch_youtube_videos(
            f"{dest.name} {dest.country}",
            vibes[:3] if vibes else None,
            limit=4,
        )

    # Run all in parallel
    enrichment_result = await enrichment_task

    pois_results = {}
    for dest_id, task in poi_tasks.items():
        try:
            pois_results[dest_id] = await task
        except Exception as e:
            print(f"POI fetch error for {dest_id}: {e}")
            pois_results[dest_id] = []

    media_results = {}
    for dest_id, task in media_tasks.items():
        try:
            media_results[dest_id] = await task
        except Exception as e:
            print(f"Media fetch error for {dest_id}: {e}")
            media_results[dest_id] = []

    return enrichment_result, pois_results, media_results


@router.get("/destination/{destination_id}")
def get_destination(destination_id: str, db: Session = Depends(get_db)):
    """Get full details for a single destination."""
    dest = db.query(Destination).filter(Destination.id == destination_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")

    return {
        "id": dest.id,
        "name": dest.name,
        "country": dest.country,
        "region": dest.region,
        "continent": dest.continent,
        "lat": dest.lat,
        "lng": dest.lng,
        "budget_tier": dest.budget_tier,
        "tourism_level": dest.tourism_level,
        "best_seasons": dest.best_seasons,
        "avg_temps": dest.avg_temps,
        "vibe_description": dest.vibe_description,
        "hero_image_url": dest.hero_image_url,
        "vibe_tags": [v.vibe_tag for v in dest.vibes],
        "negation_tags": [n.negation_tag for n in dest.negations],
        "poi_types": [p.poi_type for p in dest.poi_types],
    }


@router.get("/suggestions")
def get_suggestions():
    """Return example prompts for the input UI."""
    return {
        "suggestions": [
            "Somewhere like Kyoto but cozy and less touristy",
            "Rainy city with bookstores and old streets",
            "Italy vibes but cheaper and quieter",
            "Beach town with incredible food, not Bali",
            "Mountain village where I can completely disconnect",
            "Somewhere warm with amazing street food under $30/day",
            "I want dark academia vibes — cobblestones, old libraries, rain",
            "Give me colorful streets, cheap wine, and good coffee",
        ]
    }
