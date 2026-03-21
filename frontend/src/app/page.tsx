"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SearchSection from "@/components/SearchSection";
import LoadingState from "@/components/LoadingState";
import ItinerarySwitcher from "@/components/ItinerarySwitcher";
import ItinerarySummaryCard from "@/components/ItinerarySummaryCard";
import LocationDetailCard from "@/components/LocationDetailCard";
import ItineraryMapView from "@/components/ItineraryMapView";
import { type Itinerary, type ItineraryStop } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type ViewState = "hero" | "loading" | "itinerary" | "error";

export default function Home() {
  const [view, setView] = useState<ViewState>("hero");
  const [error, setError] = useState<string | null>(null);

  // Store real backend data mapped to itineraries
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [activeItineraryId, setActiveItineraryId] = useState<string>("");
  const [selectedStop, setSelectedStop] = useState<ItineraryStop | null>(null);

  const activeItinerary = itineraries.find((it) => it.id === activeItineraryId) || itineraries[0];

  const handleSearch = useCallback(async (prompt: string) => {
    setView("loading");
    setError(null);
    setSelectedStop(null);
    setItineraries([]);

    try {
      const res = await fetch(`${API_BASE}/api/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const data = await res.json();

      // Map backend Destinations to Itineraries
      const newItineraries: Itinerary[] = data.destinations.map((dest: any) => {
        let fallbackImage = "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1";
        if (dest.media && dest.media.length > 0 && dest.media[0].thumbnail) {
          fallbackImage = dest.media[0].thumbnail;
        }

        const tripLengthDays = dest.duration_days || 3;

        return {
          id: dest.id,
          title: dest.name,
          mainImage: dest.hero_image_url || fallbackImage,
          days: tripLengthDays,
          totalCost: dest.budget_tier,
          localTransportation: dest.local_transportation || "Walking and local public transit are highly recommended.",
          stops: dest.pois.map((poi: any, idx: number) => {
            const typeStr = (poi.type || "").toLowerCase();
            let durationStr = "2 hours";
            let timeLabel = "Activity";

            if (typeStr.includes("restaurant") || typeStr.includes("food") || typeStr.includes("meal")) {
              durationStr = "1.5 hours";
              timeLabel = idx % 2 === 0 ? "Lunch" : "Dinner";
            } else if (typeStr.includes("cafe") || typeStr.includes("coffee") || typeStr.includes("bakery")) {
              durationStr = "45 mins";
              timeLabel = "Morning Coffee";
            } else if (typeStr.includes("museum") || typeStr.includes("art") || typeStr.includes("gallery")) {
              durationStr = "3 hours";
              timeLabel = "Morning Activity";
            } else if (typeStr.includes("park") || typeStr.includes("nature") || typeStr.includes("hike")) {
              durationStr = "2-3 hours";
              timeLabel = "Afternoon Activity";
            } else if (typeStr.includes("bar") || typeStr.includes("night") || typeStr.includes("club")) {
              durationStr = "2 hours";
              timeLabel = "Evening Drink";
            } else {
              durationStr = "1-2 hours";
              timeLabel = idx % 2 === 0 ? "Morning Activity" : "Afternoon Activity";
            }

            const maxDays = tripLengthDays;
            const poisPerDay = Math.max(1, Math.ceil(dest.pois.length / maxDays));
            const dayNum = Math.min(Math.floor(idx / poisPerDay) + 1, maxDays);

            const formattedType = poi.type ? poi.type.replace(/_/g, " ").charAt(0).toUpperCase() + poi.type.slice(1).replace(/_/g, " ") : "Point of Interest";

            return {
              id: poi.place_id || `poi-${idx}`,
              name: poi.name,
              description: poi.editorial_summary || formattedType,
              time: `Day ${dayNum} • ${timeLabel} (${durationStr})`,
              duration: durationStr,
              lat: poi.lat,
              lng: poi.lng,
              image: poi.photo_url || fallbackImage,
              rating: poi.rating
            };
          }),
          media: dest.media || []
        };
      });

      setItineraries(newItineraries);
      if (newItineraries.length > 0) {
        setActiveItineraryId(newItineraries[0].id);
        setView("itinerary");
      } else {
        setError("No destinations found matching that vibe.");
        setView("error");
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("Something went wrong while compiling your vibe. Please try again.");
      setView("error");
    }
  }, []);

  const handleSwitchItinerary = useCallback((id: string) => {
    setActiveItineraryId(id);
    setSelectedStop(null);
  }, []);

  const handlePinClick = useCallback((stop: ItineraryStop) => {
    setSelectedStop(stop);
  }, []);

  const handleBackToSummary = useCallback(() => {
    setSelectedStop(null);
  }, []);

  const handleNextDestination = useCallback(() => {
    if (!selectedStop || !activeItinerary) return;
    const currentIndex = activeItinerary.stops.findIndex(
      (s) => s.id === selectedStop.id
    );
    if (currentIndex < activeItinerary.stops.length - 1) {
      setSelectedStop(activeItinerary.stops[currentIndex + 1]);
    }
  }, [selectedStop, activeItinerary]);

  const selectedStopIndex = selectedStop && activeItinerary
    ? activeItinerary.stops.findIndex((s) => s.id === selectedStop.id)
    : -1;

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
      {/* ─── Header ─── */}
      <header
        style={{
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "none",
          position: view === "itinerary" ? "absolute" : "relative",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", cursor: "pointer" }} onClick={() => setView("hero")}>
          <img src="/ocio3.png" alt="Ocio Logo" style={{ height: "44px", width: "auto", objectFit: "contain" }} />
        </div>

        {view === "itinerary" && (
          <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", width: "400px" }}>
            <SearchSection onSearch={handleSearch} compact />
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "240px", justifyContent: "flex-end" }}>
          {view === "itinerary" && activeItinerary && (
            <>
              <a
                href={`https://www.google.com/travel/flights?q=Flights%20to%20${encodeURIComponent(activeItinerary.title)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  padding: "10px 16px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: 600,
                  textDecoration: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.10)";
                }}
              >
                ✈️ Flights
              </a>
              <a
                href={`https://www.google.com/travel/search?q=Hotels%20in%20${encodeURIComponent(activeItinerary.title)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  padding: "10px 16px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: 600,
                  textDecoration: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.10)";
                }}
              >
                🏨 Hotels
              </a>
            </>
          )}
        </div>
      </header>

      {/* ─── HERO ─── */}
      <AnimatePresence mode="wait">
        {view === "hero" && !error && (
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
              Describe your dream trip in any words you want. We&apos;ll compile
              your vibe into real destinations.
            </motion.p>
            <SearchSection onSearch={handleSearch} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── LOADING ─── */}
      <AnimatePresence>
        {view === "loading" && (
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

      {/* ─── ERROR ─── */}
      <AnimatePresence>
        {error && view !== "loading" && (
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
            <p style={{ color: "var(--accent-coral)", fontSize: "16px" }}>
              {error}
            </p>
            <button
              onClick={() => {
                setError(null);
                setView("hero");
              }}
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

      {/* ─── ITINERARY VIEW ─── */}
      <AnimatePresence>
        {view === "itinerary" && (
          <motion.div
            key="itinerary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10,
            }}
          >
            {/* Full-screen Map */}
            {activeItinerary && (
              <ItineraryMapView
                itinerary={activeItinerary}
                onPinClick={handlePinClick}
                selectedStopId={selectedStop?.id}
              />
            )}

            {/* Top right: Floating Tips Box */}
            {activeItinerary && activeItinerary.localTransportation && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                style={{
                  position: "absolute",
                  top: "100px",
                  right: "32px",
                  zIndex: 20,
                  background: "var(--bg-card)",
                  padding: "16px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                  backdropFilter: "blur(16px)",
                  maxWidth: "280px",
                }}
              >
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <div>
                    <h4 style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Local Transit Tips
                    </h4>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.4 }}>
                      {activeItinerary.localTransportation}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Top center: Tab switcher */}
            <div
              style={{
                position: "absolute",
                top: "80px",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 15,
              }}
            >
              <ItinerarySwitcher
                itineraries={itineraries}
                activeId={activeItineraryId}
                onSelect={handleSwitchItinerary}
              />
            </div>

            {/* Left sidebar: Summary ↔ Detail card (vertical slide swap) */}
            <div
              style={{
                position: "absolute",
                top: "140px",
                left: "24px",
                bottom: "24px",
                zIndex: 15,
                display: "flex",
                alignItems: "flex-start",
              }}
            >
              <AnimatePresence mode="wait">
                {selectedStop && activeItinerary ? (
                  <LocationDetailCard
                    key={`detail-${selectedStop.id}`}
                    stop={selectedStop}
                    stopIndex={selectedStopIndex}
                    totalStops={activeItinerary.stops.length}
                    onBack={handleBackToSummary}
                    onNextDestination={handleNextDestination}
                  />
                ) : activeItinerary ? (
                  <ItinerarySummaryCard
                    key={`summary-${activeItinerary.id}`}
                    itinerary={activeItinerary}
                    onStopClick={handlePinClick}
                  />
                ) : null}
              </AnimatePresence>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
