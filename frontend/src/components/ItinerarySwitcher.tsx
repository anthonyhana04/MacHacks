import { motion } from "framer-motion";
import { type Itinerary } from "@/types";

interface Props {
  itineraries: Itinerary[];
  activeId: string;
  onSelect: (id: string) => void;
}

export default function ItinerarySwitcher({ itineraries, activeId, onSelect }: Props) {
  return (
    <div style={{
      display: "flex", gap: "8px", background: "var(--bg-glass)", padding: "6px",
      borderRadius: "40px", border: "1px solid var(--border-subtle)",
      backdropFilter: "blur(12px)", overflowX: "auto", maxWidth: "100%", whiteSpace: "nowrap"
    }}>
      {itineraries.map(it => (
        <button
          key={it.id}
          onClick={() => onSelect(it.id)}
          style={{
            padding: "8px 24px",
            borderRadius: "30px",
            background: activeId === it.id ? "var(--bg-card)" : "transparent",
            color: activeId === it.id ? "var(--text-primary)" : "var(--text-secondary)",
            border: activeId === it.id ? "1px solid var(--border-subtle)" : "1px solid transparent",
            fontWeight: activeId === it.id ? 600 : 400,
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          {it.title}
        </button>
      ))}
    </div>
  );
}
