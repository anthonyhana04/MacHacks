"use client";

import { motion } from "framer-motion";

interface VibeChipsProps {
  vibes: string[];
  negations: string[];
  mood: string | null;
}

export default function VibeChips({ vibes, negations, mood }: VibeChipsProps) {
  return (
    <div
      style={{
        padding: "14px 32px",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexWrap: "wrap",
        background: "var(--bg-secondary)",
      }}
    >
      <span
        style={{
          fontSize: "11px",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "1.5px",
          fontWeight: 600,
          marginRight: "4px",
        }}
      >
        Your vibe
      </span>

      {mood && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          style={{
            background: "var(--accent-purple-dim)",
            border: "1px solid var(--border-accent)",
            borderRadius: "20px",
            padding: "4px 12px",
            fontSize: "12px",
            color: "var(--accent-purple)",
            fontWeight: 500,
          }}
        >
          ✦ {mood}
        </motion.span>
      )}

      {vibes.map((vibe, i) => (
        <motion.span
          key={vibe}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 + i * 0.04 }}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "20px",
            padding: "4px 12px",
            fontSize: "12px",
            color: "var(--text-secondary)",
            fontWeight: 400,
          }}
        >
          {vibe}
        </motion.span>
      ))}

      {negations.map((neg, i) => (
        <motion.span
          key={neg}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + i * 0.04 }}
          style={{
            background: "rgba(236, 72, 153, 0.1)",
            border: "1px solid rgba(236, 72, 153, 0.2)",
            borderRadius: "20px",
            padding: "4px 12px",
            fontSize: "12px",
            color: "var(--accent-pink)",
            fontWeight: 400,
          }}
        >
          ✕ {neg}
        </motion.span>
      ))}
    </div>
  );
}
