"use client";

import { useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { NetworkGraph } from "@/components/experience/visuals/NetworkGraph";
import { useI18n } from "@/lib/experience/i18n-context";

export function FragmentationSection() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-20% 0px" });

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const chaos = useTransform(scrollYProgress, [0.1, 0.7], [0, 1]);
  const [chaosValue, setChaosValue] = useState(0);

  chaos.on("change", (v) => setChaosValue(v));

  return (
    <section
      id="fragmentation"
      ref={ref}
      className="relative min-h-screen flex items-center"
      style={{ background: "var(--void)" }}
    >
      <div className="w-full max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-32">

        {/* Left: text */}
        <div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontSize: "clamp(28px, 4vw, 52px)",
              fontWeight: 300,
              color: "var(--muted)",
              lineHeight: 1.2,
              marginBottom: "3rem",
            }}
          >
            {t.fragmentation.opening}
          </motion.p>

          {/* System list */}
          <div className="flex flex-wrap gap-3 mb-16">
            {t.fragmentation.systems.map((sys, i) => (
              <motion.span
                key={sys}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.1 + i * 0.07, duration: 0.4 }}
                className="px-3 py-1.5 text-xs font-medium tracking-wider uppercase"
                style={{
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                  letterSpacing: "0.1em",
                }}
              >
                {sys}
              </motion.span>
            ))}
          </div>

          {/* Problem statement */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.9, duration: 0.8 }}
          >
            <p
              style={{
                fontSize: "clamp(20px, 2.5vw, 32px)",
                fontWeight: 300,
                color: "var(--muted)",
                lineHeight: 1.4,
                marginBottom: "0.75rem",
              }}
            >
              {t.fragmentation.problem_a}
            </p>
            <p
              style={{
                fontSize: "clamp(20px, 2.5vw, 32px)",
                fontWeight: 400,
                color: "var(--white)",
                lineHeight: 1.4,
              }}
            >
              {t.fragmentation.problem_b}
            </p>
          </motion.div>
        </div>

        {/* Right: network visual */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="relative aspect-square w-full max-w-lg mx-auto"
        >
          <NetworkGraph
            chaos={chaosValue}
            labels={t.fragmentation.systems}
            animated
          />
        </motion.div>

      </div>
    </section>
  );
}
