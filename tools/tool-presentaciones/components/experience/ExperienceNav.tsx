"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/experience/i18n-context";
import type { Locale } from "@/lib/experience/i18n";

const T = {
  bg:         "#0D2B55",
  separator:  "#1A4F9C",
  white:      "#ffffff",
  whiteAlpha: "rgba(255,255,255,0.5)",
  btnBg:      "#1A4F9C",
  btnHover:   "#3b82f6",
  font:       "Geist, Inter, system-ui, sans-serif",
  container:  "1280px",
  paddingX:   "24px",
} as const;

const SECTIONS = [
  { id: "fragmentation", es: "El Problema",    pt: "O Problema",    en: "The Problem"   },
  { id: "whatif",        es: "La Solución",    pt: "A Solução",     en: "The Solution"  },
  { id: "difference",   es: "Por qué CORE",   pt: "Por que CORE",  en: "Why CORE"      },
  { id: "global",       es: "Alcance Global", pt: "Alcance Global",en: "Global Reach"  },
  { id: "vision",       es: "Visión 2035",    pt: "Visão 2035",    en: "Vision 2035"   },
];

const LOCALES: { value: Locale; label: string }[] = [
  { value: "es", label: "ES" },
  { value: "pt", label: "PT" },
  { value: "en", label: "EN" },
];

const containerStyle: React.CSSProperties = {
  maxWidth:  T.container,
  margin:    "0 auto",
  padding:   `0 ${T.paddingX}`,
  boxSizing: "border-box",
  width:     "100%",
};

export function ExperienceNav() {
  const { locale, setLocale, t } = useI18n();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 300,
      background: T.bg,
      backdropFilter: scrolled ? "blur(12px)" : "none",
      transition: "all 0.4s ease",
    }}>

      {/* TOP ROW */}
      <div style={{ ...containerStyle, display: "flex", alignItems: "center", gap: 12, padding: `8px ${T.paddingX}` }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 34, height: 34,
            background: "rgba(255,255,255,0.15)",
            border: "1.5px solid rgba(255,255,255,0.3)",
            borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: "1rem", color: T.white, fontFamily: T.font,
          }}>C</div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <span style={{ color: T.white, fontWeight: 800, fontSize: "0.95rem", letterSpacing: "0.08em", fontFamily: T.font, textTransform: "uppercase" }}>CORE</span>
            <span style={{ color: T.whiteAlpha, fontWeight: 400, fontSize: "0.6rem", letterSpacing: "0.12em", fontFamily: T.font, textTransform: "uppercase" }}>Presentación</span>
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Language switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {LOCALES.map((l, i) => (
            <span key={l.value} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                onClick={() => setLocale(l.value)}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  fontFamily: T.font, fontSize: "11px", fontWeight: 700,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  color: locale === l.value ? T.white : T.whiteAlpha,
                  padding: "4px 4px",
                  transition: "color 200ms",
                }}
              >{l.label}</button>
              {i < LOCALES.length - 1 && (
                <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "10px" }}>·</span>
              )}
            </span>
          ))}
        </div>

        {/* CTA */}
        <a href="#vision" style={{
          height: 34, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 16px", borderRadius: 4,
          background: T.btnBg, color: T.white, textDecoration: "none",
          fontFamily: T.font, fontSize: "12px", fontWeight: 700,
          letterSpacing: "0.08em", textTransform: "uppercase",
          transition: "background 200ms",
          flexShrink: 0,
        }}
          onMouseEnter={e => (e.currentTarget.style.background = T.btnHover)}
          onMouseLeave={e => (e.currentTarget.style.background = T.btnBg)}
        >
          {t.nav.cta}
        </a>
      </div>

      {/* SEPARATOR */}
      <div style={{ ...containerStyle, padding: `0 ${T.paddingX}` }}>
        <div style={{ height: 2, background: T.separator, transition: "background 0.4s ease" }} />
      </div>

      {/* MENU SECTIONS */}
      <div style={{ ...containerStyle, padding: `0 ${T.paddingX}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, height: 36, justifyContent: "center" }}>
          {SECTIONS.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              style={{
                padding: "0 14px", height: 36, display: "flex", alignItems: "center",
                color: "rgba(255,255,255,0.75)", fontFamily: T.font, fontSize: "0.82rem",
                fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
                textDecoration: "none", transition: "color 150ms ease",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = T.white)}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
            >
              {s[locale]}
            </a>
          ))}
        </div>
      </div>

    </header>
  );
}


