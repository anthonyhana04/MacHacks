"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const LOADING_MESSAGES = [
  "Building your itinerary...",
  "Finding ideal routes...",
  "Curating top destinations...",
  "Tailoring experiences...",
  "Compiling travel paths...",
  "Finalizing schedule...",
];

export default function LoadingState() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "32px",
        maxWidth: "400px",
      }}
    >
      {/* Elegant Spinner */}
      <div style={{ position: "relative", width: "60px", height: "60px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "3px solid var(--border-subtle)",
            borderTopColor: "var(--accent-purple)",
            borderRightColor: "var(--accent-cyan)",
          }}
        />
      </div>

      {/* Loading message */}
      <motion.p
        key={messageIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        style={{
          fontSize: "16px",
          color: "var(--text-secondary)",
          textAlign: "center",
          fontStyle: "italic",
        }}
      >
        {LOADING_MESSAGES[messageIndex]}
      </motion.p>

    </div>
  );
}
