import { motion } from "framer-motion";
import { type ItineraryStop } from "@/types";

interface Props {
  stop: ItineraryStop;
  stopIndex: number;
  totalStops: number;
  onBack: () => void;
  onNextDestination: () => void;
}

export default function LocationDetailCard({ stop, stopIndex, totalStops, onBack, onNextDestination }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      style={{
        width: "360px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)", overflow: "hidden", backdropFilter: "blur(16px)",
        boxShadow: "var(--shadow-glow)", display: "flex", flexDirection: "column",
        maxHeight: "100%"
      }}
    >
      <div style={{ position: "relative", height: "240px", flexShrink: 0 }}>
        <img 
          src={stop.image || "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1"} 
          alt={stop.name} 
          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
        />
        <button onClick={onBack} style={{
          position: "absolute", top: "16px", left: "16px", background: "rgba(0,0,0,0.5)",
          color: "#fff", border: "none", borderRadius: "50%", width: "36px", height: "36px",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)"
        }}>←</button>
      </div>
      <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
        <p style={{ color: "var(--accent-cyan)", fontSize: "12px", fontWeight: 700, marginBottom: "8px", letterSpacing: "1px" }}>
          STOP {stopIndex + 1} OF {totalStops} • {stop.time}
        </p>
        <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px", color: "var(--text-primary)" }}>{stop.name}</h2>
        {stop.rating && <p style={{ fontSize: "14px", color: "#FBBF24", marginBottom: "16px", fontWeight: 600 }}>★ {stop.rating.toFixed(1)} / 5.0</p>}
        <p style={{ color: "var(--text-secondary)", fontSize: "15px", lineHeight: 1.6, marginBottom: "32px" }}>
          {stop.description}
        </p>
        {stopIndex < totalStops - 1 && (
          <button onClick={onNextDestination} style={{
            width: "100%", padding: "14px", background: "var(--accent-cyan-dim)",
            color: "var(--accent-cyan)", border: "1px solid var(--border-accent)",
            borderRadius: "var(--radius-md)", cursor: "pointer", fontWeight: 600,
            transition: "all 0.2s"
          }}>
            Next Stop →
          </button>
        )}
      </div>
    </motion.div>
  );
}
