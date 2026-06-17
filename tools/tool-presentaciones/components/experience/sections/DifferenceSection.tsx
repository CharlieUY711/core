"use client";
import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useI18n } from "@/lib/experience/i18n-context";

const CAP_COLORS: Record<string, string> = {
  foundation: "rgba(74,240,196,0.8)",
  rep:         "rgba(212,180,120,0.8)",
  logistics:   "rgba(120,180,240,0.8)",
  market:      "rgba(180,140,220,0.8)",
  directshipment: "rgba(240,180,100,0.8)",
  finance:     "rgba(100,220,160,0.8)",
  intelligence:"rgba(220,160,120,0.8)",
};

export function DifferenceSection() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const [active, setActive] = useState<string | null>(null);

  const caps = [...t.ecosystem.capabilities] as Array<{ id: string; name: string; desc: string }>;
  const before = [...t.difference.before] as string[];
  const after  = [...t.difference.after]  as string[];

  return (
    <section
      id="difference"
      ref={ref}
      style={{ background: "#0A1F3D", padding: "0 0 160px" }}
    >
      {/* Ecosystem block */}
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "128px 24px 80px" }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          style={{ textAlign: "center", marginBottom: "72px" }}
        >
          <p style={{ fontSize: "11px", letterSpacing: "0.22em", color: "rgba(74,240,196,0.5)", textTransform: "uppercase", marginBottom: "16px" }}>
            {t.ecosystem.label}
          </p>
          <h2 style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(28px,4vw,52px)", fontWeight: 400, color: "#E0D0B0", margin: "0 0 16px" }}>
            {t.ecosystem.title}
          </h2>
          <p style={{ fontSize: "15px", color: "rgba(180,165,130,0.6)", maxWidth: "480px", margin: "0 auto", lineHeight: 1.7 }}>
            {t.ecosystem.sub}
          </p>
        </motion.div>

        {/* Capabilities grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1px",
          background: "rgba(212,180,120,0.08)",
          border: "1px solid rgba(212,180,120,0.08)",
          borderRadius: "3px",
          overflow: "hidden",
          marginBottom: "100px",
        }}>
          {caps.map((cap, i) => {
            const color = CAP_COLORS[cap.id] ?? "rgba(212,180,120,0.8)";
            const isActive = active === cap.id;
            return (
              <motion.div
                key={cap.id}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.08 }}
                onClick={() => setActive(isActive ? null : cap.id)}
                style={{
                  padding: "36px 32px",
                  background: isActive ? "rgba(5,20,50,0.9)" : "#0A1F3D",
                  cursor: "pointer",
                  borderLeft: isActive ? `2px solid ${color}` : "2px solid transparent",
                  transition: "all 0.25s ease",
                }}
                whileHover={{ background: "rgba(5,20,50,0.6)" }}
              >
                <div style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color, marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", background: color, flexShrink: 0 }} />
                  {cap.name}
                </div>
                <div style={{ fontFamily: "'Georgia', serif", fontSize: "17px", color: "#E0D0B0", marginBottom: isActive ? "12px" : 0, transition: "margin 0.2s" }}>
                  {cap.name.replace("CORE ", "")}
                </div>
                <div style={{
                  fontSize: "13px", color: "rgba(180,165,130,0.65)", lineHeight: 1.7,
                  maxHeight: isActive ? "100px" : 0, overflow: "hidden",
                  transition: "max-height 0.4s ease, opacity 0.3s",
                  opacity: isActive ? 1 : 0,
                }}>
                  {cap.desc}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Difference: before vs after */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4 }}
        >
          <p style={{ fontSize: "11px", letterSpacing: "0.22em", color: "rgba(180,100,100,0.5)", textTransform: "uppercase", marginBottom: "16px", textAlign: "center" }}>
            {t.difference.label}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "rgba(212,180,120,0.08)", border: "1px solid rgba(212,180,120,0.08)", borderRadius: "3px", overflow: "hidden" }}>
            {/* Before */}
            <div style={{ padding: "40px 36px", background: "#0A1F3D" }}>
              <p style={{ fontSize: "11px", letterSpacing: "0.15em", color: "rgba(180,80,60,0.6)", textTransform: "uppercase", marginBottom: "24px" }}>
                {t.difference.before_label}
              </p>
              {before.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                  <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: "rgba(180,60,40,0.12)", border: "1px solid rgba(180,60,40,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: "rgba(220,100,80,0.7)", flexShrink: 0 }}>×</span>
                  <span style={{ fontSize: "14px", color: "rgba(180,130,120,0.7)" }}>{item}</span>
                </div>
              ))}
            </div>

            {/* After */}
            <div style={{ padding: "40px 36px", background: "rgba(5,20,40,0.5)" }}>
              <p style={{ fontSize: "11px", letterSpacing: "0.15em", color: "rgba(74,240,196,0.5)", textTransform: "uppercase", marginBottom: "24px" }}>
                {t.difference.after_label}
              </p>
              {after.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                  <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: "rgba(74,240,196,0.12)", border: "1px solid rgba(74,240,196,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: "rgba(74,240,196,0.8)", flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: "14px", color: "rgba(180,220,200,0.8)" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Claim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.7 }}
          style={{ textAlign: "center", padding: "80px 40px 0" }}
        >
          <p style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(18px,3vw,26px)", color: "rgba(180,165,130,0.45)", margin: "0 0 10px", fontStyle: "italic" }}>
            {t.claim.before}
          </p>
          <p style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(24px,4vw,40px)", color: "#D4B478", margin: 0, fontWeight: 700 }}>
            {t.claim.after}
          </p>
        </motion.div>
      </div>
    </section>
  );
}


