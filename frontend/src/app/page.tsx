"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SearchSection from "@/components/SearchSection";
import VibeChips from "@/components/VibeChips";
import DestinationCard from "@/components/DestinationCard";
import DetailPanel from "@/components/DetailPanel";
import LoadingState from "@/components/LoadingState";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Destination {
  id: string;
  name: string;
  country: string;
  region: string;
  match_score: number;
  hero_image_url: string | null;
  budget_tier: string;
  best_seasons: string[];
  coordinates: { lat: number; lng: number };
  vibe_tags: string[];
  why_it_matches: string;
  mini_itinerary: string[];
  neighborhood_highlight: string;
  pois: Array<{
    place_id: string;
    name: string;
    type: string;
    lat: number;
    lng: number;
    rating: number;
  }>;
  media: Array<{
    video_id: string;
    title: string;
    channel: string;
    thumbnail: string;
  }>;
}

interface ParsedIntent {
  anchor: { name: string | null; country: string | null };
  vibes: string[];
  negations: string[];
  mood: string | null;
}

interface RecommendResponse {
  parsed_intent: ParsedIntent;
  destinations: Destination[];
  meta: { response_ms: number; cached: boolean };
}

export default function Home() {
  const [results, setResults] = useState<RecommendResponse | null>(null);
  const [selectedDest, setSelectedDest] = useState<Destination | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async (prompt: string) => {
    setLoading(true);
    setError(null);
    setResults(null);
    setSelectedDest(null);

    try {
      const res = await fetch(`${API_BASE}/api/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const data: RecommendResponse = await res.json();
      setResults(data);

      // Auto-select first destination
      if (data.destinations.length > 0) {
        setSelectedDest(data.destinations[0]);
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("Something went wrong while compiling your vibe. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <main
      style={{
        position: "relative",
        zIndex: 1,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "22px" }}>✦</span>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "22px",
              fontWeight: 700,
              background: "var(--gradient-primary)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.5px",
            }}
          >
            Vibe Compiler
          </h1>
        </div>
        <span
          style={{
            fontSize: "13px",
            color: "var(--text-muted)",
            fontWeight: 400,
          }}
        >
          AI Trip Planner
        </span>
      </header>

      {/* Hero / Search Section */}
      <AnimatePresence mode="wait">
        {!results && !loading && (
          <motion.div
            key="hero"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 24px",
              maxWidth: "720px",
              margin: "0 auto",
              width: "100%",
            }}
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 600,
                textAlign: "center",
                lineHeight: 1.3,
                marginBottom: "12px",
                color: "var(--text-primary)",
              }}
            >
              Where do you want to go?
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              style={{
                fontSize: "16px",
                color: "var(--text-secondary)",
                textAlign: "center",
                marginBottom: "40px",
                maxWidth: "500px",
                lineHeight: 1.6,
              }}
            >
              Describe your dream trip in any words you want. We&apos;ll compile your vibe
              into real destinations.
            </motion.p>
            <SearchSection onSearch={handleSearch} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 24px",
            }}
          >
            <LoadingState />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      <AnimatePresence>
        {error && !loading && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 24px",
              gap: "20px",
            }}
          >
            <p style={{ color: "var(--accent-pink)", fontSize: "16px" }}>
              {error}
            </p>
            <button
              onClick={() => setError(null)}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                padding: "10px 24px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {results && !loading && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* Compact search bar at top when results showing */}
            <div
              style={{
                padding: "20px 32px",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <SearchSection onSearch={handleSearch} compact />
            </div>

            {/* Parsed vibe chips */}
            {results.parsed_intent.vibes.length > 0 && (
              <VibeChips
                vibes={results.parsed_intent.vibes}
                negations={results.parsed_intent.negations}
                mood={results.parsed_intent.mood}
              />
            )}

            {/* Results layout */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "400px 1fr",
                gap: "0",
                minHeight: "calc(100vh - 200px)",
              }}
            >
              {/* Destination list */}
              <div
                style={{
                  borderRight: "1px solid var(--border-subtle)",
                  overflowY: "auto",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    fontWeight: 600,
                    padding: "0 4px",
                  }}
                >
                  {results.destinations.length} destinations found
                  {results.meta.cached && " · cached"}
                  {" · "}
                  {results.meta.response_ms}ms
                </p>
                {results.destinations.map((dest, i) => (
                  <DestinationCard
                    key={dest.id}
                    destination={dest}
                    rank={i + 1}
                    selected={selectedDest?.id === dest.id}
                    onClick={() => setSelectedDest(dest)}
                    index={i}
                  />
                ))}
              </div>

              {/* Detail panel */}
              <div style={{ overflowY: "auto" }}>
                {selectedDest && <DetailPanel destination={selectedDest} />}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
