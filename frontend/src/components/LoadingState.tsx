"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const LOADING_MESSAGES = [
  "Scanning vibes...",
  "Cross-referencing cozy with walkable...",
  "Consulting the vibe oracle...",
  "Mapping emotional terrain...",
  "Compiling your vibe...",
  "Finding hidden gems...",
  "Checking cobblestone density...",
  "Measuring cafe-per-street ratio...",
  "Analyzing rainy-day charm factor...",
  "Calibrating wanderlust engine...",
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
      {/* Animated orb */}
      <div style={{ position: "relative", width: "80px", height: "80px" }}>
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "var(--gradient-primary)",
            filter: "blur(20px)",
          }}
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute",
            inset: "10px",
            borderRadius: "50%",
            border: "2px solid transparent",
            borderTopColor: "var(--accent-purple)",
            borderRightColor: "var(--accent-pink)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
          }}
        >
          🔮
        </div>
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

      {/* Shimmer cards */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          width: "100%",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="shimmer"
            style={{
              height: "72px",
              opacity: 1 - i * 0.25,
            }}
          />
        ))}
      </div>
    </div>
  );
}
