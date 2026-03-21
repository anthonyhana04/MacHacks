"""
Vibe Compiler — FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import recommend

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Vibe Compiler API",
    description="Turn messy travel vibes into real destinations",
    version="0.1.0",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(recommend.router, prefix="/api", tags=["recommend"])


@app.get("/")
def root():
    return {"status": "ok", "service": "vibe-compiler", "version": "0.1.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}
