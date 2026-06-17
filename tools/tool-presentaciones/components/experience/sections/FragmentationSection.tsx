"use client";
import { useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { NetworkGraph } from "@/components/experience/visuals/NetworkGraph";
import { useI18n } from "@/lib/experience/i18n-context";

export function FragmentationSection() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-20% 0px" });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const chaos = useTransform(scrollYProgress, [0.1, 0.7], [0, 1]);
  const [chaosValue, setChaosValue] = useState(0);
  chaos.on("change", (v) => setChaosValue(v));

  const systems = [...t.fragmentation.systems] as string[];

  return (
    <section
      id="fragmentation"
      ref={ref}
      style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", background: "#0A1F3D" }}
    >
      <div
        style={{
          width: "100%", maxWidth: "1280px", margin: "0 auto", padding: "128px 24px",
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "64px", alignItems: "center",
        }}
      >
        <div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            style={{ fontWeight: 700, fontSize: "clamp(28px,4vw,52px)", color: "#8fa3bf", lineHeight: 1.2, marginBottom: "40px" }}
          >
            {t.fragmentation.opening}
          </motion.p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "48px" }}>
            {systems.map((sys, i) => (
              <motion.span
                key={sys}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.1 + i * 0.07 }}
                style={{
                  padding: "6px 12px", fontSize: "11px", fontFamily: "monospace", borderRadius: "8px",
                  border: "1px solid #1e3354", color: "#8fa3bf", background: "rgba(15,56,117,0.12)",
                  letterSpacing: "0.1em", textTransform: "uppercase",
                }}
              >
                {sys}
              </motion.span>
            ))}
          </div>

          <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.9 }}>
            <p style={{ fontWeight: 700, fontSize: "clamp(20px,2.5vw,32px)", color: "#8fa3bf", marginBottom: "8px" }}>
              {t.fragmentation.problem_a}
            </p>
            <p
              style={{
                fontWeight: 700, fontSize: "clamp(20px,2.5vw,32px)",
                background: "linear-gradient(135deg,#fff 30%,#f5c870 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}
            >
              {t.fragmentation.problem_b}
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.3 }}
          style={{ aspectRatio: "1", width: "100%", maxWidth: "500px", margin: "0 auto" }}
        >
          <NetworkGraph chaos={chaosValue} labels={systems} animated />
        </motion.div>
      </div>
    </section>
  );
}


