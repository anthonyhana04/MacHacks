"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
    photo_url: string | null;
  }>;
  media: Array<{
    video_id: string;
    title: string;
    channel: string;
    thumbnail: string;
  }>;
}

interface DetailPanelProps {
  destination: Destination;
}

export default function DetailPanel({ destination }: DetailPanelProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

  // Initialize or update map
  useEffect(() => {
    if (!mapRef.current || !MAPBOX_TOKEN) return;

    const initMap = async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      await import("mapbox-gl/dist/mapbox-gl.css");

      mapboxgl.accessToken = MAPBOX_TOKEN;

      // Clean up existing map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const map = new mapboxgl.Map({
        container: mapRef.current!,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [destination.coordinates.lng, destination.coordinates.lat],
        zoom: 13,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

      map.on("load", () => {
        setMapLoaded(true);

        // Add POI markers
        destination.pois.forEach((poi) => {
          const el = document.createElement("div");
          el.style.width = "28px";
          el.style.height = "28px";
          el.style.borderRadius = "50%";
          el.style.background = "var(--accent-purple)";
          el.style.border = "2px solid white";
          el.style.cursor = "pointer";
          el.style.display = "flex";
          el.style.alignItems = "center";
          el.style.justifyContent = "center";
          el.style.fontSize = "12px";
          el.textContent = getPoiEmoji(poi.type);
          el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";

          const popup = new mapboxgl.Popup({
            offset: 20,
            closeButton: false,
          }).setHTML(
            `<strong>${poi.name}</strong><br/>
             <span style="opacity:0.7">${poi.type} · ⭐ ${poi.rating}</span>`
          );

          new mapboxgl.Marker(el)
            .setLngLat([poi.lng, poi.lat])
            .setPopup(popup)
            .addTo(map);
        });
      });

      mapInstanceRef.current = map;
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [destination.id, destination.coordinates.lat, destination.coordinates.lng, MAPBOX_TOKEN, destination.pois]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={destination.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}
      >
        {/* Header */}
        <div>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "28px",
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: "4px",
            }}
          >
            {destination.name}
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            {destination.country} · {destination.region}
          </p>
        </div>

        {/* Why it matches — full version */}
        <div
          style={{
            background: "var(--gradient-card)",
            border: "1px solid var(--border-accent)",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              color: "var(--accent-purple)",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              fontWeight: 600,
              marginBottom: "8px",
            }}
          >
            ✦ Why this matches your vibe
          </p>
          <p
            style={{
              fontSize: "15px",
              color: "var(--text-primary)",
              lineHeight: 1.7,
            }}
          >
            {destination.why_it_matches}
          </p>
          {destination.neighborhood_highlight && (
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                marginTop: "8px",
                fontStyle: "italic",
              }}
            >
              📍 {destination.neighborhood_highlight}
            </p>
          )}
        </div>

        {/* Map */}
        <div>
          <h3
            style={{
              fontSize: "13px",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "1px",
              fontWeight: 600,
              marginBottom: "12px",
            }}
          >
            Map & Points of Interest
          </h3>
          {MAPBOX_TOKEN ? (
            <div
              ref={mapRef}
              style={{
                width: "100%",
                height: "340px",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-card)",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "340px",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "32px" }}>🗺️</span>
              <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                Add NEXT_PUBLIC_MAPBOX_TOKEN to enable maps
              </p>
            </div>
          )}

          {/* POI list */}
          {destination.pois.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginTop: "16px",
              }}
            >
              {destination.pois.map((poi) => (
                <div
                  key={poi.place_id}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    padding: "0",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    transition: "transform 0.2s ease",
                  }}
                >
                  {poi.photo_url ? (
                    <img
                      src={poi.photo_url}
                      alt={poi.name}
                      style={{
                        width: "100%",
                        height: "100px",
                        objectFit: "cover",
                        borderBottom: "1px solid var(--border-subtle)",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100px",
                        background: "var(--bg-subtle)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "24px",
                        borderBottom: "1px solid var(--border-subtle)",
                      }}
                    >
                      {getPoiEmoji(poi.type)}
                    </div>
                  )}
                  <div style={{ padding: "10px 12px" }}>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--text-primary)",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {poi.name}
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {poi.type.split('_').join(' ')} · ⭐ {poi.rating}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mini Itinerary */}
        {destination.mini_itinerary.length > 0 && (
          <div>
            <h3
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontWeight: 600,
                marginBottom: "12px",
              }}
            >
              Suggested Itinerary
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {destination.mini_itinerary.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                  }}
                >
                  <span
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: "var(--accent-purple-dim)",
                      border: "1px solid var(--border-accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--accent-purple)",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "var(--text-primary)",
                      lineHeight: 1.5,
                    }}
                  >
                    {item}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Media Strip */}
        {destination.media.length > 0 && (
          <div>
            <h3
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontWeight: 600,
                marginBottom: "12px",
              }}
            >
              Videos & Content
            </h3>
            <div
              style={{
                display: "flex",
                gap: "12px",
                overflowX: "auto",
                paddingBottom: "8px",
              }}
            >
              {destination.media.map((video) => (
                <motion.div
                  key={video.video_id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() =>
                    setActiveVideo(
                      activeVideo === video.video_id ? null : video.video_id
                    )
                  }
                  style={{
                    flexShrink: 0,
                    width: "260px",
                    borderRadius: "var(--radius-md)",
                    overflow: "hidden",
                    border: "1px solid var(--border-subtle)",
                    cursor: "pointer",
                    background: "var(--bg-card)",
                  }}
                >
                  {activeVideo === video.video_id ? (
                    <iframe
                      width="260"
                      height="146"
                      src={`https://www.youtube.com/embed/${video.video_id}?autoplay=1`}
                      title={video.title}
                      frameBorder="0"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                      style={{ display: "block" }}
                    />
                  ) : (
                    <div style={{ position: "relative" }}>
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        style={{
                          width: "260px",
                          height: "146px",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(0,0,0,0.3)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "36px",
                            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
                          }}
                        >
                          ▶
                        </span>
                      </div>
                    </div>
                  )}
                  <div style={{ padding: "10px 12px" }}>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "var(--text-primary)",
                        fontWeight: 500,
                        lineHeight: 1.4,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {video.title}
                    </p>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        marginTop: "2px",
                      }}
                    >
                      {video.channel}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Vibe tags */}
        <div>
          <h3
            style={{
              fontSize: "13px",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "1px",
              fontWeight: 600,
              marginBottom: "12px",
            }}
          >
            Vibe Tags
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {destination.vibe_tags.map((tag) => (
              <span
                key={tag}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "20px",
                  padding: "5px 14px",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Best seasons */}
        {destination.best_seasons.length > 0 && (
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <span style={{ fontSize: "20px" }}>📅</span>
            <div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>
                Best time to visit
              </p>
              <p style={{ fontSize: "14px", color: "var(--text-primary)" }}>
                {destination.best_seasons
                  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                  .join(", ")}
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function getPoiEmoji(type: string): string {
  const map: Record<string, string> = {
    cafe: "☕",
    restaurant: "🍽️",
    temple: "⛩️",
    hindu_temple: "🛕",
    museum: "🏛️",
    park: "🌳",
    market: "🛍️",
    shopping_mall: "🛍️",
    church: "⛪",
    bar: "🍸",
    night_club: "🎵",
    book_store: "📚",
    bookstore: "📚",
    natural_feature: "🏖️",
    tourist_attraction: "📸",
    art_gallery: "🎨",
    castle: "🏰",
    fortress: "🏰",
    viewpoint: "👀",
    beach: "🏖️",
    hike: "🥾",
    lake: "🏞️",
    garden: "🌺",
    wine: "🍷",
    brewery: "🍺",
    pub: "🍺",
  };
  return map[type.toLowerCase()] || "📍";
}
