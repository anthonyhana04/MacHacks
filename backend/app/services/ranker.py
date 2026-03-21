"""
Destination Ranker — Scores and ranks destinations against parsed intent.
All algorithmic, no LLM calls. Uses multi-signal weighted scoring.
"""
import numpy as np
from sqlalchemy.orm import Session
from app.models.models import Destination, DestinationVibe, DestinationNegation, DestinationPoiType


# Scoring weights
WEIGHTS = {
    "vibe_embedding": 0.35,
    "vibe_tags": 0.25,
    "poi_match": 0.15,
    "constraints": 0.15,
    "negation": 0.10,
}

# Weights when no anchor is provided (rebalanced)
WEIGHTS_NO_ANCHOR = {
    "vibe_embedding": 0.45,
    "vibe_tags": 0.30,
    "poi_match": 0.15,
    "constraints": 0.05,
    "negation": 0.05,
}

BUDGET_ORDER = {"budget": 0, "mid": 1, "luxury": 2}
TOURISM_ORDER = {"low": 0, "moderate": 1, "high": 2, "extreme": 3}


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    a_np = np.array(a, dtype=np.float32)
    b_np = np.array(b, dtype=np.float32)
    dot = np.dot(a_np, b_np)
    norm_a = np.linalg.norm(a_np)
    norm_b = np.linalg.norm(b_np)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))


def jaccard_similarity(set_a: set, set_b: set) -> float:
    """Compute Jaccard similarity between two sets."""
    if not set_a and not set_b:
        return 0.0
    intersection = set_a & set_b
    union = set_a | set_b
    return len(intersection) / len(union) if union else 0.0


def score_constraint_satisfaction(parsed_constraints: dict, candidate: Destination, anchor: Destination | None) -> float:
    """Score how well a candidate satisfies parsed constraints. Returns 0-1."""
    score = 1.0
    checks = 0

    budget = parsed_constraints.get("budget")
    if budget and budget in BUDGET_ORDER:
        checks += 1
        candidate_budget = BUDGET_ORDER.get(candidate.budget_tier, 1)
        target_budget = BUDGET_ORDER[budget]
        if candidate_budget <= target_budget:
            score += 1.0
        elif candidate_budget == target_budget + 1:
            score += 0.5

    if parsed_constraints.get("cheaper_than_anchor") and anchor:
        checks += 1
        anchor_budget = BUDGET_ORDER.get(anchor.budget_tier, 1)
        candidate_budget = BUDGET_ORDER.get(candidate.budget_tier, 1)
        if candidate_budget < anchor_budget:
            score += 1.0
        elif candidate_budget == anchor_budget:
            score += 0.5

    if parsed_constraints.get("warmer_than_anchor") and anchor:
        checks += 1
        # Compare average temps (rough: use average of all months)
        anchor_avg = _avg_temp(anchor.avg_temps)
        candidate_avg = _avg_temp(candidate.avg_temps)
        if candidate_avg > anchor_avg:
            score += 1.0
        elif candidate_avg >= anchor_avg - 2:
            score += 0.5

    if parsed_constraints.get("cooler_than_anchor") and anchor:
        checks += 1
        anchor_avg = _avg_temp(anchor.avg_temps)
        candidate_avg = _avg_temp(candidate.avg_temps)
        if candidate_avg < anchor_avg:
            score += 1.0
        elif candidate_avg <= anchor_avg + 2:
            score += 0.5

    if checks == 0:
        return 1.0  # No constraints to check
    return min(score / (checks + 1), 1.0)


def _avg_temp(temps: dict) -> float:
    """Average temperature across all months."""
    if not temps:
        return 20.0
    values = [v for v in temps.values() if isinstance(v, (int, float))]
    return sum(values) / len(values) if values else 20.0


def score_negation_penalty(negations: list[str], candidate_vibes: set[str], candidate_tourism: str) -> float:
    """Penalize candidates that match negation criteria. Returns 0-1."""
    if not negations:
        return 1.0

    penalty = 0.0
    negation_set = set(n.lower() for n in negations)

    # Check if candidate vibes overlap with negations
    overlap = negation_set & candidate_vibes
    penalty += len(overlap) * 0.3

    # Special handling for common negations
    if "touristy" in negation_set or "crowded" in negation_set:
        if candidate_tourism in ("high", "extreme"):
            penalty += 0.4

    return max(1.0 - penalty, 0.0)


def rank_destinations(
    db: Session,
    parsed_intent: dict,
    query_embedding: list[float] | None = None,
    top_k: int = 5,
) -> list[dict]:
    """
    Rank all destinations against the parsed intent.
    Returns top_k destinations with scores.
    """
    # Load all destinations with their tags
    destinations = db.query(Destination).all()

    # Find anchor destination if specified
    anchor = None
    anchor_name = parsed_intent.get("anchor", {}).get("name")
    anchor_country = parsed_intent.get("anchor", {}).get("country")

    if anchor_name:
        anchor = _find_anchor(destinations, anchor_name)
    elif anchor_country:
        # Country-level anchor: compute average embedding
        anchor = _find_country_anchor(destinations, anchor_country)

    # Choose weights based on whether we have an anchor
    weights = WEIGHTS if anchor else WEIGHTS_NO_ANCHOR

    # Get parsed data
    parsed_vibes = set(v.lower() for v in parsed_intent.get("vibes", []))
    parsed_negations = parsed_intent.get("negations", [])
    parsed_pois = set(p.lower() for p in parsed_intent.get("poi_preferences", []))
    parsed_constraints = parsed_intent.get("constraints", {})

    scored = []
    for dest in destinations:
        # Skip the anchor itself
        if anchor and dest.id == anchor.id:
            continue

        # Skip if country-level anchor and candidate is in the same country
        if anchor_country and not anchor_name and dest.country.lower() == anchor_country.lower():
            continue

        # Get candidate's tags
        cand_vibes = set(v.vibe_tag.lower() for v in dest.vibes)
        cand_pois = set(p.poi_type.lower() for p in dest.poi_types)
        cand_negation_tags = set(n.negation_tag.lower() for n in dest.negations)

        # Score each signal
        embedding_score = 0.0
        if query_embedding and dest.vibe_embedding:
            embedding_score = cosine_similarity(query_embedding, dest.vibe_embedding)
            # Normalize from [-1, 1] to [0, 1]
            embedding_score = (embedding_score + 1.0) / 2.0

        vibe_tag_score = jaccard_similarity(parsed_vibes, cand_vibes)
        poi_score = jaccard_similarity(parsed_pois, cand_pois)
        constraint_score = score_constraint_satisfaction(parsed_constraints, dest, anchor)
        negation_score = score_negation_penalty(parsed_negations, cand_vibes, dest.tourism_level)

        # Weighted combination
        total_score = (
            weights["vibe_embedding"] * embedding_score
            + weights["vibe_tags"] * vibe_tag_score
            + weights["poi_match"] * poi_score
            + weights["constraints"] * constraint_score
            + weights["negation"] * negation_score
        )

        scored.append({
            "destination": dest,
            "score": round(total_score, 4),
            "signals": {
                "embedding": round(embedding_score, 3),
                "vibe_tags": round(vibe_tag_score, 3),
                "poi_match": round(poi_score, 3),
                "constraints": round(constraint_score, 3),
                "negation": round(negation_score, 3),
            },
        })

    # Sort by score descending
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]


def _find_anchor(destinations: list[Destination], name: str) -> Destination | None:
    """Find the anchor destination by name (fuzzy match)."""
    name_lower = name.lower()
    for dest in destinations:
        if name_lower in dest.name.lower() or dest.name.lower() in name_lower:
            return dest
    return None


def _find_country_anchor(destinations: list[Destination], country: str) -> Destination | None:
    """Find first destination in the country to use as reference for constraints."""
    country_lower = country.lower()
    for dest in destinations:
        if dest.country.lower() == country_lower:
            return dest
    return None
