"""
Generate embeddings for all destinations — run once after seeding.
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.models import Destination
from app.services.embeddings import generate_embedding


def generate_all_embeddings():
    db = SessionLocal()
    try:
        destinations = db.query(Destination).all()
        print(f"Generating embeddings for {len(destinations)} destinations...")

        for i, dest in enumerate(destinations):
            if dest.vibe_embedding and len(dest.vibe_embedding) > 0:
                print(f"  [{i+1}/{len(destinations)}] {dest.name} — already has embedding, skipping")
                continue

            embedding = generate_embedding(dest.vibe_description)
            if embedding:
                dest.vibe_embedding = embedding
                db.commit()
                print(f"  [{i+1}/{len(destinations)}] {dest.name} — ✓ ({len(embedding)} dims)")
            else:
                print(f"  [{i+1}/{len(destinations)}] {dest.name} — ✗ failed")

            # Rate limiting: OpenAI allows ~3000 RPM for embeddings
            time.sleep(0.1)

        print("✓ All embeddings generated")

    except Exception as e:
        db.rollback()
        print(f"✗ Embedding generation failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    generate_all_embeddings()
