from sqlalchemy import Column, String, Text, Float, Integer, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import relationship
from app.database import Base


class Destination(Base):
    __tablename__ = "destinations"

    id = Column(String, primary_key=True)  # "hoi-an-vietnam"
    name = Column(String, nullable=False)
    country = Column(String, nullable=False)
    region = Column(String, nullable=False)  # "Southeast Asia"
    continent = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    budget_tier = Column(String, nullable=False)  # "budget" | "mid" | "luxury"
    tourism_level = Column(String, nullable=False)  # "low" | "moderate" | "high" | "extreme"
    best_seasons = Column(JSONB, nullable=False)  # ["oct","nov","dec"]
    avg_temps = Column(JSONB, nullable=False)  # {"jan":22,"apr":28,...}
    vibe_description = Column(Text, nullable=False)
    vibe_embedding = Column(ARRAY(Float), nullable=True)  # 1536-dim vector
    hero_image_url = Column(String, nullable=True)
    similar_to = Column(JSONB, nullable=True)  # ["luang-prabang", "porto"]
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    vibes = relationship("DestinationVibe", back_populates="destination", cascade="all, delete-orphan")
    negations = relationship("DestinationNegation", back_populates="destination", cascade="all, delete-orphan")
    poi_types = relationship("DestinationPoiType", back_populates="destination", cascade="all, delete-orphan")
    neighborhoods = relationship("Neighborhood", back_populates="destination", cascade="all, delete-orphan")


class DestinationVibe(Base):
    __tablename__ = "destination_vibes"

    destination_id = Column(String, ForeignKey("destinations.id"), primary_key=True)
    vibe_tag = Column(String, primary_key=True)

    destination = relationship("Destination", back_populates="vibes")


class DestinationNegation(Base):
    __tablename__ = "destination_negations"

    destination_id = Column(String, ForeignKey("destinations.id"), primary_key=True)
    negation_tag = Column(String, primary_key=True)

    destination = relationship("Destination", back_populates="negations")


class DestinationPoiType(Base):
    __tablename__ = "destination_poi_types"

    destination_id = Column(String, ForeignKey("destinations.id"), primary_key=True)
    poi_type = Column(String, primary_key=True)

    destination = relationship("Destination", back_populates="poi_types")


class Neighborhood(Base):
    __tablename__ = "neighborhoods"

    id = Column(String, primary_key=True)
    destination_id = Column(String, ForeignKey("destinations.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    vibe_tags = Column(JSONB, nullable=True)

    destination = relationship("Destination", back_populates="neighborhoods")


class ResponseCache(Base):
    __tablename__ = "response_cache"

    prompt_hash = Column(String, primary_key=True)
    response = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    ttl_hours = Column(Integer, default=24)


class QueryLog(Base):
    __tablename__ = "query_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    raw_prompt = Column(Text, nullable=False)
    parsed_intent = Column(JSONB, nullable=True)
    top_results = Column(JSONB, nullable=True)
    response_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
