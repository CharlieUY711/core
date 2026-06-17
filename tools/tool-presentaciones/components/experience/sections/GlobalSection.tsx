"use client";
import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useI18n } from "@/lib/experience/i18n-context";

export function GlobalSection() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const [paraguayCore, setParaguayCore] = useState(false);

  const before = [...t.paraguay.before] as string[];
  const after  = [...t.paraguay.after]  as string[];

  return (
    <section
      id="casos"
      ref={ref}
      style={{ background: "#0A1F3D", padding: "0 0 160px" }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "128px 24px" }}>

        {/* Paraguay case */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          style={{ marginBottom: "100px" }}
        >
          <p style={{ fontSize: "11px", letterSpacing: "0.22em", color: "rgba(120,180,240,0.55)", textTransform: "uppercase", marginBottom: "16px" }}>
            {t.paraguay.label}
          </p>
          <h2 style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 400, color: "#E0D0B0", margin: "0 0 48px", lineHeight: 1.2, maxWidth: "700px" }}>
            {t.paraguay.title}
          </h2>

          {/* Toggle */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "32px", maxWidth: "400px" }}>
            <button
              onClick={() => setParaguayCore(false)}
              style={{
                flex: 1, padding: "10px 20px",
                background: !paraguayCore ? "rgba(180,60,40,0.15)" : "transparent",
                border: !paraguayCore ? "1px solid rgba(180,60,40,0.4)" : "1px solid rgba(212,180,120,0.1)",
                borderRadius: "2px", cursor: "pointer",
                fontSize: "11px", color: !paraguayCore ? "rgba(220,120,100,0.9)" : "rgba(180,165,130,0.4)",
                letterSpacing: "0.12em", textTransform: "uppercase", transition: "all 0.2s",
              }}
            >
              {t.paraguay.before_label}
            </button>
            <button
              onClick={() => setParaguayCore(true)}
              style={{
                flex: 1, padding: "10px 20px",
                background: paraguayCore ? "rgba(30,100,70,0.2)" : "transparent",
                border: paraguayCore ? "1px solid rgba(74,240,196,0.35)" : "1px solid rgba(212,180,120,0.1)",
                borderRadius: "2px", cursor: "pointer",
                fontSize: "11px", color: paraguayCore ? "rgba(74,240,196,0.9)" : "rgba(180,165,130,0.4)",
                letterSpacing: "0.12em", textTransform: "uppercase", transition: "all 0.2s",
              }}
            >
              {t.paraguay.after_label}
            </button>
          </div>

          <div style={{
            border: "1px solid rgba(212,180,120,0.1)",
            borderLeft: paraguayCore ? "2px solid rgba(74,240,196,0.4)" : "2px solid rgba(180,60,40,0.3)",
            borderRadius: "3px", padding: "32px", background: "rgba(5,15,35,0.4)",
            maxWidth: "600px",
          }}>
            {(paraguayCore ? after : before).map((item, i) => (
              <motion.div
                key={`${paraguayCore}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: i < (paraguayCore ? after : before).length - 1 ? "12px" : 0 }}
              >
                <span style={{
                  width: "16px", height: "16px", borderRadius: "50%", flexShrink: 0,
                  background: paraguayCore ? "rgba(74,240,196,0.12)" : "rgba(180,60,40,0.12)",
                  border: paraguayCore ? "1px solid rgba(74,240,196,0.3)" : "1px solid rgba(180,60,40,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "9px", color: paraguayCore ? "rgba(74,240,196,0.8)" : "rgba(220,100,80,0.7)",
                }}>
                  {paraguayCore ? "✓" : "×"}
                </span>
                <span style={{ fontSize: "14px", color: paraguayCore ? "rgba(180,220,200,0.8)" : "rgba(180,130,120,0.65)", lineHeight: 1.5 }}>
                  {item}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Cardisan case */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
          style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: "64px", alignItems: "center",
            padding: "60px", border: "1px solid rgba(212,180,120,0.1)", borderRadius: "3px",
            background: "rgba(5,15,35,0.3)",
          }}
        >
          <div>
            <p style={{ fontSize: "11px", letterSpacing: "0.22em", color: "rgba(212,180,120,0.45)", textTransform: "uppercase", marginBottom: "16px" }}>
              {t.cardisan.label}
            </p>
            <h3 style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(22px,3vw,36px)", fontWeight: 400, color: "#E0D0B0", margin: "0 0 20px", lineHeight: 1.2 }}>
              {t.cardisan.title}
            </h3>
            <p style={{ fontSize: "15px", color: "rgba(180,165,130,0.6)", lineHeight: 1.7, margin: 0 }}>
              {t.cardisan.desc}
            </p>
          </div>

          {/* Cardisan capability grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {["CORE Rep", "CORE Logistics", "CORE Market", "CORE Intelligence"].map((cap, i) => (
              <motion.div
                key={cap}
                initial={{ opacity: 0, x: 20 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.4 + i * 0.08 }}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 16px",
                  border: "1px solid rgba(212,180,120,0.1)",
                  borderRadius: "2px",
                  background: "rgba(10,31,61,0.6)",
                }}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "rgba(74,240,196,0.6)", flexShrink: 0 }} />
                <span style={{ fontSize: "12px", color: "rgba(212,180,120,0.7)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  {cap}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  );
}


