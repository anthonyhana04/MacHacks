"""
Database seed script — loads curated destinations into PostgreSQL.
"""
import json
import os
import sys

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, SessionLocal, Base
from app.models.models import (
    Destination, DestinationVibe, DestinationNegation, DestinationPoiType
)

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "destinations.json")


def seed():
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("✓ Tables created")

    db = SessionLocal()

    try:
        # Clear existing data
        db.query(DestinationVibe).delete()
        db.query(DestinationNegation).delete()
        db.query(DestinationPoiType).delete()
        db.query(Destination).delete()
        db.commit()
        print("✓ Cleared existing data")

        # Load seed data
        with open(DATA_FILE, "r") as f:
            destinations = json.load(f)

        for dest_data in destinations:
            # Create destination
            dest = Destination(
                id=dest_data["id"],
                name=dest_data["name"],
                country=dest_data["country"],
                region=dest_data["region"],
                continent=dest_data["continent"],
                lat=dest_data["lat"],
                lng=dest_data["lng"],
                budget_tier=dest_data["budget_tier"],
                tourism_level=dest_data["tourism_level"],
                best_seasons=dest_data["best_seasons"],
                avg_temps=dest_data["avg_temps"],
                vibe_description=dest_data["vibe_description"],
                hero_image_url=dest_data.get("hero_image_url"),
                similar_to=dest_data.get("similar_to"),
                vibe_embedding=None,  # Will be generated separately
            )
            db.add(dest)

            # Add vibe tags
            for vibe in dest_data.get("vibes", []):
                db.add(DestinationVibe(destination_id=dest_data["id"], vibe_tag=vibe))

            # Add negation tags
            for neg in dest_data.get("negations", []):
                db.add(DestinationNegation(destination_id=dest_data["id"], negation_tag=neg))

            # Add POI types
            for poi in dest_data.get("poi_types", []):
                db.add(DestinationPoiType(destination_id=dest_data["id"], poi_type=poi))

        db.commit()
        print(f"✓ Seeded {len(destinations)} destinations")

    except Exception as e:
        db.rollback()
        print(f"✗ Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
