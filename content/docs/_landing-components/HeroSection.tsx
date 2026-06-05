"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/lib/experience/i18n-context";
import { NetworkGraph } from "@/components/experience/visuals/NetworkGraph";

export function HeroSection() {
  const { t } = useI18n();

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "var(--void)" }}
    >
      {/* Background network */}
      <div className="absolute inset-0 opacity-20">
        <NetworkGraph chaos={0.15} labels={["", "", "", "", "", "", "", "", ""]} animated />
      </div>

      {/* Radial gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 60% at 50% 50%, transparent 0%, var(--void) 75%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1
            className="text-white mb-8 leading-none"
            style={{
              fontSize: "clamp(64px, 12vw, 144px)",
              fontWeight: 300,
              letterSpacing: "-0.02em",
            }}
          >
            CORE
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <p
            className="mb-4"
            style={{
              fontSize: "clamp(14px, 2vw, 20px)",
              fontWeight: 300,
              color: "var(--muted)",
              letterSpacing: "0.04em",
            }}
          >
            {t.hero.tagline}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.1 }}
        >
          <p
            style={{
              fontSize: "clamp(12px, 1.5vw, 14px)",
              color: "var(--subtle)",
              letterSpacing: "0.08em",
            }}
          >
            {t.hero.sub}
          </p>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.6 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span style={{ fontSize: "10px", letterSpacing: "0.15em", color: "var(--subtle)", textTransform: "uppercase" }}>
          {t.hero.scroll}
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-8"
          style={{ background: "linear-gradient(to bottom, var(--subtle), transparent)" }}
        />
      </motion.div>
    </section>
  );
}
