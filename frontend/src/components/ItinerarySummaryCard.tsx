import { motion } from "framer-motion";
import { type Itinerary, type ItineraryStop } from "@/types";

interface Props {
  itinerary: Itinerary;
  onStopClick: (stop: ItineraryStop) => void;
}

export default function ItinerarySummaryCard({ itinerary, onStopClick }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{
        width: "360px",
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
        display: "flex",
        flexDirection: "column",
        maxHeight: "100%",
      }}
    >
      {/* Hero Image */}
      <div style={{ position: "relative", height: "160px" }}>
        <img
          src={itinerary.mainImage}
          alt={itinerary.title}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, var(--bg-card) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* Routes / Timeline */}
      <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
        <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-primary)", fontWeight: 700, marginBottom: "16px" }}>
          Trip Timeline
        </h3>
        
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", top: "12px", bottom: "24px", left: "11px", width: "2px", background: "var(--border-subtle)", zIndex: 0 }} />
          
          {itinerary.stops.map((stop, i) => (
            <motion.div
              key={stop.id}
              whileHover={{ x: 4 }}
              onClick={() => onStopClick(stop)}
              style={{
                position: "relative",
                display: "flex",
                gap: "16px",
                marginBottom: i === itinerary.stops.length - 1 ? 0 : "24px",
                cursor: "pointer",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "var(--bg-secondary)",
                  border: "2px solid var(--accent-cyan)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  color: "var(--accent-cyan)",
                  fontWeight: 800,
                  boxShadow: "0 0 10px rgba(6, 182, 212, 0.3)",
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500, marginBottom: "2px" }}>
                  {stop.time} ({stop.duration})
                </p>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                  {stop.name}
                </p>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: "1.4" }}>
                  {stop.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Media Carousel */}
      {itinerary.media && itinerary.media.length > 0 && (
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }}>
          <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--accent-cyan)", fontWeight: 600, marginBottom: "12px" }}>
            City Vibes
          </h3>
          <div className="custom-scrollbar" style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "12px" }}>
            {itinerary.media.map((video, idx) => (
              <a 
                key={(video as any).video_id || idx} 
                href={`https://www.youtube.com/watch?v=${(video as any).video_id || (video as any).id}`} 
                target="_blank" 
                rel="noreferrer" 
                style={{ flexShrink: 0, width: "160px", textDecoration: "none" }}
              >
                <div style={{ width: "160px", height: "90px", borderRadius: "8px", overflow: "hidden", position: "relative" }}>
                  <img src={video.thumbnail} alt={video.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ 
                    position: "absolute", inset: 0, background: "rgba(0,0,0,0.2)", 
                    display: "flex", alignItems: "center", justifyContent: "center" 
                  }}>
                    <div style={{
                      width: "32px", height: "32px", background: "rgba(0,0,0,0.7)", 
                      borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                      fontSize: "12px", backdropFilter: "blur(4px)"
                    }}>
                      ▶
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {video.title}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
