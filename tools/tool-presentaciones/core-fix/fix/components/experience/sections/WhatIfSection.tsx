"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useI18n } from "@/lib/experience/i18n-context";

export function WhatIfSection() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });

  const primitives = [...t.whatif.primitives] as string[];

  return (
    <section
      id="whatif"
      ref={ref}
      style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", background: "#0A1F3D" }}
    >
      <div style={{ width: "100%", maxWidth: "1280px", margin: "0 auto", padding: "128px 24px" }}>

        {/* Central question */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          style={{ textAlign: "center", marginBottom: "80px" }}
        >
          <p style={{
            fontSize: "11px", letterSpacing: "0.22em", color: "rgba(74,240,196,0.5)",
            textTransform: "uppercase", marginBottom: "24px",
          }}>
            LA SOLUCIÓN
          </p>
          <h2 style={{
            fontFamily: "'Georgia', serif",
            fontSize: "clamp(32px,5vw,64px)",
            fontWeight: 400,
            color: "#E0D0B0",
            lineHeight: 1.15,
            margin: "0 0 24px",
          }}>
            {t.whatif.question}
          </h2>
          <p style={{
            fontSize: "clamp(16px,2vw,20px)",
            color: "rgba(74,240,196,0.7)",
            fontFamily: "'Georgia', serif",
            fontStyle: "italic",
            maxWidth: "640px",
            margin: "0 auto",
            lineHeight: 1.6,
          }}>
            {t.whatif.sub}
          </p>
        </motion.div>

        {/* Primitives convergence */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "1px",
          background: "rgba(212,180,120,0.08)",
          border: "1px solid rgba(212,180,120,0.08)",
          borderRadius: "4px",
          overflow: "hidden",
          maxWidth: "800px",
          margin: "0 auto",
        }}>
          {primitives.map((p, i) => (
            <motion.div
              key={p}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.6 }}
              style={{
                padding: "32px 24px",
                background: "#0A1F3D",
                textAlign: "center",
              }}
            >
              <div style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: "rgba(74,240,196,0.6)",
                margin: "0 auto 16px",
              }} />
              <span style={{
                fontSize: "12px",
                color: "rgba(212,180,120,0.7)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontFamily: "'Georgia', serif",
              }}>
                {p}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Connecting arrow to CORE */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.9 }}
          style={{ textAlign: "center", padding: "48px 0" }}
        >
          <div style={{ width: "1px", height: "60px", background: "linear-gradient(to bottom, rgba(74,240,196,0.4), rgba(212,180,120,0.6))", margin: "0 auto 24px" }} />
          <div style={{
            display: "inline-block",
            padding: "16px 40px",
            border: "1px solid rgba(74,240,196,0.3)",
            borderRadius: "3px",
            background: "rgba(5,20,45,0.8)",
          }}>
            <span style={{
              fontFamily: "'Georgia', serif",
              fontSize: "24px",
              fontWeight: 700,
              color: "rgba(74,240,196,0.9)",
              letterSpacing: "0.15em",
            }}>
              CORE
            </span>
          </div>
          <div style={{ width: "1px", height: "40px", background: "linear-gradient(to bottom, rgba(212,180,120,0.4), transparent)", margin: "24px auto 0" }} />
        </motion.div>

      </div>
    </section>
  );
}


