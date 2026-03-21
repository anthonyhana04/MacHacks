"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface SearchSectionProps {
  onSearch: (prompt: string) => void;
  compact?: boolean;
}

const DEFAULT_SUGGESTIONS = [
  "Somewhere like Kyoto but cozy and less touristy",
  "Rainy city with bookstores and old streets",
  "Italy vibes but cheaper and quieter",
  "Beach town with incredible food, not Bali",
  "Dark academia vibes — cobblestones, old libraries, rain",
  "Colorful streets, cheap wine, and good coffee",
];

export default function SearchSection({ onSearch, compact }: SearchSectionProps) {
  const [prompt, setPrompt] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);

  useEffect(() => {
    fetch(`${API_BASE}/api/suggestions`)
      .then((r) => r.json())
      .then((data) => {
        if (data.suggestions) setSuggestions(data.suggestions);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim().length >= 3) {
      onSearch(prompt.trim());
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
    onSearch(suggestion);
  };

  if (compact) {
    return (
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: "12px",
          maxWidth: "700px",
        }}
      >
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe another vibe..."
          style={{
            flex: 1,
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 16px",
            color: "var(--text-primary)",
            fontSize: "14px",
            outline: "none",
            fontFamily: "inherit",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent-purple)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
        />
        <button
          type="submit"
          style={{
            background: "var(--gradient-primary)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            padding: "10px 20px",
            color: "white",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          🔮 Compile
        </button>
      </form>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <form onSubmit={handleSubmit}>
        <div
          style={{
            position: "relative",
            marginBottom: "16px",
          }}
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='Try: "I want somewhere like Porto but warmer with amazing street food..."'
            rows={3}
            style={{
              width: "100%",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: "20px 24px",
              color: "var(--text-primary)",
              fontSize: "16px",
              lineHeight: 1.6,
              outline: "none",
              resize: "none",
              fontFamily: "inherit",
              transition: "border-color 0.3s, box-shadow 0.3s",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--accent-purple)";
              e.target.style.boxShadow = "var(--shadow-glow)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--border-subtle)";
              e.target.style.boxShadow = "none";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
        </div>
        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            width: "100%",
            background: "var(--gradient-primary)",
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "14px 24px",
            color: "white",
            fontSize: "16px",
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "0.3px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <span>🔮</span> Compile my vibe
        </motion.button>
      </form>

      {/* Suggestion chips */}
      <div
        style={{
          marginTop: "24px",
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            alignSelf: "center",
            marginRight: "4px",
          }}
        >
          Try:
        </span>
        {suggestions.slice(0, 5).map((suggestion, i) => (
          <motion.button
            key={i}
            onClick={() => handleSuggestionClick(suggestion)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.08 }}
            whileHover={{ scale: 1.03, borderColor: "var(--accent-purple)" }}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "20px",
              padding: "6px 14px",
              color: "var(--text-secondary)",
              fontSize: "12px",
              cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: "inherit",
            }}
          >
            {suggestion}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
