"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useI18n } from "@/lib/experience/i18n-context";

function CounterStat({
  target,
  suffix,
  label,
  delay,
  inView,
}: {
  target: number;
  suffix: string;
  label: string;
  delay: number;
  inView: boolean;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1500;
    const start = Date.now() + delay * 1000;
    const timer = setInterval(() => {
      const now = Date.now();
      if (now < start) return;
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.round(eased * target));
      if (progress === 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, delay]);

  const display = target >= 1000 ? value.toLocaleString() : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-2"
    >
      <p
        style={{
          fontSize: "clamp(40px, 5vw, 72px)",
          fontWeight: 300,
          color: "var(--white)",
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {display}
        {suffix && <span style={{ color: "var(--muted)" }}>{suffix}</span>}
      </p>
      <p
        style={{
          fontSize: "12px",
          color: "var(--subtle)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
    </motion.div>
  );
}

export function VisionSection() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });

  return (
    <section
      id="vision"
      ref={ref}
      className="relative min-h-screen flex items-center"
      style={{ background: "var(--void)" }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(to right, transparent, var(--border), transparent)" }}
      />

      <div className="w-full max-w-7xl mx-auto px-8 py-32">

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          style={{
            fontSize: "11px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--subtle)",
            marginBottom: "5rem",
          }}
        >
          {t.vision.label}
        </motion.p>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 mb-24">
          {t.vision.stats.map((stat, i) => (
            <CounterStat
              key={stat.label}
              target={stat.value}
              suffix={stat.suffix}
              label={stat.label}
              delay={0.2 + i * 0.15}
              inView={inView}
            />
          ))}
        </div>

        {/* Infrastructure statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1, duration: 0.8 }}
          className="mb-20"
        >
          <p
            style={{
              fontSize: "clamp(24px, 3.5vw, 52px)",
              fontWeight: 300,
              color: "var(--muted)",
              lineHeight: 1.2,
              marginBottom: "0.5rem",
            }}
          >
            This is not a software product.
          </p>
          <p
            style={{
              fontSize: "clamp(24px, 3.5vw, 52px)",
              fontWeight: 400,
              color: "var(--white)",
              lineHeight: 1.2,
            }}
          >
            {t.vision.title}
          </p>
        </motion.div>

        {/* Final claim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="pt-12 mb-16"
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
              fontSize: "clamp(20px, 2.5vw, 36px)",
              fontWeight: 400,
              color: "var(--white)",
            }}
          >
            {t.claim.after}
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.8, duration: 0.6 }}
        >
          <a
            href="mailto:hello@core.com"
            className="inline-block px-10 py-4 text-sm font-medium tracking-widest uppercase transition-all"
            style={{
              border: "1px solid rgba(255,255,255,0.4)",
              color: "var(--white)",
              letterSpacing: "0.12em",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = "white";
              (e.target as HTMLElement).style.color = "black";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = "transparent";
              (e.target as HTMLElement).style.color = "var(--white)";
            }}
          >
            {t.vision.cta}
          </a>
        </motion.div>

      </div>
    </section>
  );
}
