"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SearchSection from "@/components/SearchSection";
import LoadingState from "@/components/LoadingState";
import ItinerarySwitcher from "@/components/ItinerarySwitcher";
import ItinerarySummaryCard from "@/components/ItinerarySummaryCard";
import LocationDetailCard from "@/components/LocationDetailCard";
import ItineraryMapView from "@/components/ItineraryMapView";
import {
  MOCK_ITINERARIES,
  type ItineraryStop,
} from "@/data/mockItineraries";

type ViewState = "hero" | "loading" | "itinerary";

export default function Home() {
  const [view, setView] = useState<ViewState>("hero");
  const [error, setError] = useState<string | null>(null);

  // Itinerary state
  const [activeItineraryId, setActiveItineraryId] = useState<string>(
    MOCK_ITINERARIES[0].id
  );
  const [selectedStop, setSelectedStop] = useState<ItineraryStop | null>(null);
  const [savedItineraries, setSavedItineraries] = useState<Set<string>>(
    new Set()
  );

  const activeItinerary =
    MOCK_ITINERARIES.find((it) => it.id === activeItineraryId) ||
    MOCK_ITINERARIES[0];

  const handleSearch = useCallback(async (_prompt: string) => {
    setView("loading");
    setError(null);
    setSelectedStop(null);

    // Simulate API delay, then show itinerary view with mock data
    setTimeout(() => {
      setActiveItineraryId(MOCK_ITINERARIES[0].id);
      setView("itinerary");
    }, 1800);
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
    if (!selectedStop) return;
    const currentIndex = activeItinerary.stops.findIndex(
      (s) => s.id === selectedStop.id
    );
    if (currentIndex < activeItinerary.stops.length - 1) {
      setSelectedStop(activeItinerary.stops[currentIndex + 1]);
    }
  }, [selectedStop, activeItinerary.stops]);

  const handleAddItinerary = useCallback((id: string) => {
    setSavedItineraries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectedStopIndex = selectedStop
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
          borderBottom:
            view === "itinerary" ? "none" : "1px solid var(--border-subtle)",
          position: view === "itinerary" ? "absolute" : "relative",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
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

        {view === "itinerary" && (
          <div style={{ flex: 1, maxWidth: "400px", margin: "0 20px" }}>
            <SearchSection onSearch={handleSearch} compact />
          </div>
        )}

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
            <ItineraryMapView
              itinerary={activeItinerary}
              onPinClick={handlePinClick}
              selectedStopId={selectedStop?.id}
            />

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
                itineraries={MOCK_ITINERARIES}
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
                {selectedStop ? (
                  <LocationDetailCard
                    key={`detail-${selectedStop.id}`}
                    stop={selectedStop}
                    stopIndex={selectedStopIndex}
                    totalStops={activeItinerary.stops.length}
                    onBack={handleBackToSummary}
                    onNextDestination={handleNextDestination}
                  />
                ) : (
                  <ItinerarySummaryCard
                    key={`summary-${activeItinerary.id}`}
                    itinerary={activeItinerary}
                    onAddItinerary={handleAddItinerary}
                    onStopClick={handlePinClick}
                    isAdded={savedItineraries.has(activeItinerary.id)}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Bottom right: Saved toast */}
            <AnimatePresence>
              {savedItineraries.has(activeItinerary.id) && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  style={{
                    position: "absolute",
                    bottom: "32px",
                    right: "32px",
                    zIndex: 15,
                    background: "rgba(6, 182, 212, 0.12)",
                    border: "1px solid rgba(6, 182, 212, 0.3)",
                    borderRadius: "var(--radius-md)",
                    padding: "10px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    boxShadow: "0 4px 20px rgba(6, 182, 212, 0.15)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "14px",
                      color: "var(--accent-cyan)",
                    }}
                  >
                    ✓
                  </span>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--accent-cyan)",
                    }}
                  >
                    Itinerary Added
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
