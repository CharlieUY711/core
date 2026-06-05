"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useI18n } from "@/lib/experience/i18n-context";

const PRIMITIVE_POSITIONS = [
  { x: 50, y: 50 },   // center
  { x: 50, y: 18 },   // top
  { x: 80, y: 33 },   // top right
  { x: 80, y: 67 },   // bottom right
  { x: 50, y: 82 },   // bottom
  { x: 20, y: 67 },   // bottom left
  { x: 20, y: 33 },   // top left
];

const CHAOS_FROM = [
  { x: 50, y: 50 },
  { x: 10, y: 5 },
  { x: 95, y: 15 },
  { x: 90, y: 85 },
  { x: 50, y: 98 },
  { x: 5, y: 80 },
  { x: 8, y: 20 },
];

export function WhatIfSection() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });

  return (
    <section
      id="whatif"
      ref={ref}
      className="relative min-h-screen flex items-center"
      style={{ background: "var(--void)" }}
    >
      {/* Subtle separator line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(to right, transparent, var(--border), transparent)" }}
      />

      <div className="w-full max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-32">

        {/* Left: convergence visual */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="relative aspect-square w-full max-w-lg mx-auto order-2 lg:order-1"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Connection lines to center */}
            {PRIMITIVE_POSITIONS.slice(1).map((pos, i) => (
              <motion.line
                key={i}
                x1={pos.x}
                y1={pos.y}
                x2={50}
                y2={50}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="0.3"
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
              />
            ))}

            {/* Outer nodes */}
            {t.whatif.primitives.map((label, i) => {
              const from = CHAOS_FROM[i + 1];
              const to = PRIMITIVE_POSITIONS[i + 1];
              return (
                <motion.g
                  key={label}
                  initial={{ x: from.x - to.x, y: from.y - to.y, opacity: 0 }}
                  animate={inView ? { x: 0, y: 0, opacity: 1 } : {}}
                  transition={{
                    delay: 0.2 + i * 0.08,
                    duration: 0.9,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <circle
                    cx={to.x}
                    cy={to.y}
                    r={4}
                    fill="var(--surface)"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="0.4"
                  />
                  <text
                    x={to.x}
                    y={to.y + 0.5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="3.2"
                    fill="rgba(255,255,255,0.7)"
                    fontFamily="system-ui, sans-serif"
                    fontWeight="400"
                  >
                    {label}
                  </text>
                </motion.g>
              );
            })}

            {/* Center nucleus */}
            <motion.g
              initial={{ opacity: 0, scale: 0 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.6, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Glow rings */}
              <circle cx={50} cy={50} r={10} fill="rgba(255,255,255,0.03)" />
              <circle cx={50} cy={50} r={7} fill="rgba(255,255,255,0.05)" />
              {/* Core */}
              <circle cx={50} cy={50} r={4.5} fill="white" opacity={0.92} />
              <text
                x={50}
                y={50.5}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="2.8"
                fill="black"
                fontFamily="system-ui, sans-serif"
                fontWeight="600"
              >
                CORE
              </text>
            </motion.g>
          </svg>
        </motion.div>

        {/* Right: text */}
        <div className="order-1 lg:order-2">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontSize: "clamp(28px, 4vw, 56px)",
              fontWeight: 300,
              color: "var(--white)",
              lineHeight: 1.15,
              marginBottom: "2rem",
            }}
          >
            {t.whatif.question}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.5 }}
            style={{
              fontSize: "clamp(16px, 1.8vw, 20px)",
              fontWeight: 300,
              color: "var(--muted)",
              lineHeight: 1.7,
              marginBottom: "3rem",
            }}
          >
            {t.whatif.sub}
          </motion.p>

          {/* Primitives list */}
          <div className="flex flex-col gap-2">
            {t.whatif.primitives.map((p, i) => (
              <motion.div
                key={p}
                initial={{ opacity: 0, x: -16 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.7 + i * 0.07, duration: 0.5 }}
                className="flex items-center gap-3"
              >
                <div className="w-1 h-1 rounded-full bg-white opacity-40" />
                <span
                  style={{
                    fontSize: "14px",
                    color: "var(--muted)",
                    letterSpacing: "0.05em",
                  }}
                >
                  {p}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
