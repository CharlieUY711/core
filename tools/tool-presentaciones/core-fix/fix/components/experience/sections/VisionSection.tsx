"use client";
import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useI18n } from "@/lib/experience/i18n-context";

function Counter({ value, suffix, duration = 1800 }: { value: number; suffix: string; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(ease * value));
      if (p < 1) requestAnimationFrame(tick);
      else setDisplay(value);
    };
    requestAnimationFrame(tick);
  }, [value, duration]);

  const formatted = display >= 1000
    ? display.toLocaleString("es-AR").replace(/,/g, ".")
    : display.toString();

  return <>{formatted}{suffix}</>;
}

export function VisionSection() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });

  const stats = [...t.vision.stats] as Array<{ value: number; suffix: string; label: string }>;
  const statement = t.vision.title as string;

  return (
    <section
      id="vision"
      ref={ref}
      style={{ background: "#0A1F3D", padding: "0 0 160px" }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "128px 24px" }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          style={{ textAlign: "center", marginBottom: "80px" }}
        >
          <p style={{ fontSize: "11px", letterSpacing: "0.22em", color: "rgba(180,140,220,0.5)", textTransform: "uppercase", marginBottom: "16px" }}>
            {t.vision.label}
          </p>
          <h2 style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(28px,4vw,48px)", fontWeight: 400, color: "#E0D0B0", margin: 0, lineHeight: 1.2, maxWidth: "640px", marginLeft: "auto", marginRight: "auto" }}>
            {statement}
          </h2>
        </motion.div>

        {/* Stats */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1px", background: "rgba(212,180,120,0.08)",
          border: "1px solid rgba(212,180,120,0.08)",
          borderRadius: "3px", overflow: "hidden", marginBottom: "80px",
        }}>
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.1 + i * 0.12 }}
              style={{ padding: "48px 28px", background: "#0A1F3D", textAlign: "center" }}
            >
              <div style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(32px,4vw,52px)", fontWeight: 700, color: "#D4B478", lineHeight: 1, marginBottom: "14px" }}>
                {inView ? <Counter value={s.value} suffix={s.suffix} /> : "0"}
              </div>
              <div style={{ fontSize: "12px", color: "rgba(180,165,130,0.55)", lineHeight: 1.5 }}>
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Final claim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
          style={{ textAlign: "center", padding: "60px 40px", position: "relative" }}
        >
          <div style={{ width: "1px", height: "40px", background: "linear-gradient(to bottom, transparent, rgba(212,180,120,0.3))", margin: "0 auto 40px" }} />
          <p style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(18px,3vw,28px)", color: "rgba(180,165,130,0.45)", margin: "0 0 10px", fontStyle: "italic" }}>
            {t.claim.before}
          </p>
          <p style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(24px,4vw,44px)", color: "#D4B478", margin: 0, fontWeight: 700 }}>
            {t.claim.after}
          </p>
          <div style={{ width: "1px", height: "40px", background: "linear-gradient(to top, transparent, rgba(212,180,120,0.3))", margin: "40px auto 0" }} />
        </motion.div>

        {/* CTA */}
        <div style={{ textAlign: "center" }}>
          <button
            style={{
              background: "rgba(212,180,120,0.12)",
              border: "1px solid rgba(212,180,120,0.4)",
              borderRadius: "2px", cursor: "pointer",
              fontSize: "12px", color: "#D4B478",
              padding: "16px 48px",
              letterSpacing: "0.15em", textTransform: "uppercase",
              transition: "all 0.3s", fontFamily: "inherit",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(212,180,120,0.22)"; e.currentTarget.style.borderColor = "rgba(212,180,120,0.8)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(212,180,120,0.12)"; e.currentTarget.style.borderColor = "rgba(212,180,120,0.4)"; }}
          >
            {t.vision.cta}
          </button>
        </div>

      </div>
    </section>
  );
}


