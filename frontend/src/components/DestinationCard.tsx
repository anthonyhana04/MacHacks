"use client";

import { motion } from "framer-motion";

interface Destination {
  id: string;
  name: string;
  country: string;
  region: string;
  match_score: number;
  hero_image_url: string | null;
  budget_tier: string;
  vibe_tags: string[];
  why_it_matches: string;
}

interface DestinationCardProps {
  destination: Destination;
  rank: number;
  selected: boolean;
  onClick: () => void;
  index: number;
}

const rankEmojis = ["🏆", "🥈", "🥉", "4", "5"];

const budgetLabel: Record<string, string> = {
  budget: "💰 Budget",
  mid: "💰💰 Mid-range",
  luxury: "💰💰💰 Luxury",
};

export default function DestinationCard({
  destination,
  rank,
  selected,
  onClick,
  index,
}: DestinationCardProps) {
  const scorePercent = Math.round(destination.match_score * 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: index * 0.1,
        type: "spring",
        stiffness: 200,
        damping: 25,
      }}
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      style={{
        background: selected ? "var(--bg-card-hover)" : "var(--bg-card)",
        border: selected
          ? "1px solid var(--border-accent)"
          : "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "16px",
        cursor: "pointer",
        transition: "all 0.2s",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Gradient accent on selected */}
      {selected && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: "var(--gradient-primary)",
          }}
        />
      )}

      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: rank <= 3 ? "18px" : "13px", opacity: rank <= 3 ? 1 : 0.5 }}>
            {rank <= 3 ? rankEmojis[rank - 1] : `#${rank}`}
          </span>
          <div>
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--text-primary)",
                fontFamily: "'Playfair Display', serif",
              }}
            >
              {destination.name}
            </h3>
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                marginTop: "1px",
              }}
            >
              {destination.country}
            </p>
          </div>
        </div>

        {/* Score badge */}
        <div
          style={{
            background: scorePercent >= 80
              ? "rgba(20, 184, 166, 0.15)"
              : scorePercent >= 60
              ? "rgba(59, 130, 246, 0.15)"
              : "var(--accent-purple-dim)",
            border: `1px solid ${
              scorePercent >= 80
                ? "rgba(20, 184, 166, 0.3)"
                : scorePercent >= 60
                ? "rgba(59, 130, 246, 0.3)"
                : "var(--border-accent)"
            }`,
            borderRadius: "20px",
            padding: "3px 10px",
            fontSize: "12px",
            fontWeight: 600,
            color: scorePercent >= 80
              ? "var(--accent-teal)"
              : scorePercent >= 60
              ? "var(--accent-blue)"
              : "var(--accent-purple)",
          }}
        >
          {scorePercent}%
        </div>
      </div>

      {/* Why it matches */}
      <p
        style={{
          fontSize: "13px",
          color: "var(--text-secondary)",
          lineHeight: 1.5,
          marginBottom: "10px",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {destination.why_it_matches}
      </p>

      {/* Tags */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "4px",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            marginRight: "2px",
          }}
        >
          {budgetLabel[destination.budget_tier] || destination.budget_tier}
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>·</span>
        {destination.vibe_tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              background: "rgba(255,255,255,0.04)",
              padding: "2px 8px",
              borderRadius: "10px",
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
