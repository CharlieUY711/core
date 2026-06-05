"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useI18n } from "@/lib/experience/i18n-context";

export function DifferenceSection() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });

  return (
    <section
      id="difference"
      ref={ref}
      className="relative min-h-screen flex items-center"
      style={{ background: "var(--void)" }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(to right, transparent, var(--border), transparent)" }}
      />

      <div className="w-full max-w-7xl mx-auto px-8 py-32">

        {/* Label */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          style={{
            fontSize: "11px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--subtle)",
            marginBottom: "5rem",
          }}
        >
          {t.difference.label}
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32">

          {/* Before — Traditional */}
          <div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.2 }}
              style={{
                fontSize: "11px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--subtle)",
                marginBottom: "2.5rem",
              }}
            >
              {t.difference.before_label}
            </motion.p>

            <div className="flex flex-col gap-4">
              {t.difference.before.map((item, i) => (
                <motion.p
                  key={item}
                  initial={{ opacity: 0, x: -20 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    fontSize: "clamp(28px, 3.5vw, 48px)",
                    fontWeight: 300,
                    color: "var(--subtle)",
                    lineHeight: 1.1,
                    textDecoration: inView ? "line-through" : "none",
                    textDecorationColor: "rgba(255,255,255,0.15)",
                    transition: "text-decoration 0.3s",
                  }}
                >
                  {item}
                </motion.p>
              ))}
            </div>
          </div>

          {/* After — CORE */}
          <div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.6 }}
              style={{
                fontSize: "11px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--subtle)",
                marginBottom: "2.5rem",
              }}
            >
              {t.difference.after_label}
            </motion.p>

            <div className="flex flex-col gap-4">
              {t.difference.after.map((item, i) => (
                <motion.p
                  key={item}
                  initial={{ opacity: 0, x: 20 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.7 + i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    fontSize: "clamp(28px, 3.5vw, 48px)",
                    fontWeight: 400,
                    color: "var(--white)",
                    lineHeight: 1.1,
                  }}
                >
                  {item}
                </motion.p>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom claim */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="mt-24 pt-12"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <p
            style={{
              fontSize: "clamp(14px, 1.5vw, 18px)",
              color: "var(--subtle)",
              textDecoration: "line-through",
              textDecorationColor: "rgba(255,255,255,0.2)",
              marginBottom: "0.75rem",
            }}
          >
            {t.claim.before}
          </p>
          <p
            style={{
              fontSize: "clamp(20px, 2.5vw, 32px)",
              fontWeight: 400,
              color: "var(--white)",
            }}
          >
            {t.claim.after}
          </p>
        </motion.div>

      </div>
    </section>
  );
}
