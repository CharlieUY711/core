"use client";
import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useI18n } from "@/lib/experience/i18n-context";

type Term = { term: string; definition: string; context: string; example: string };

export function GlosarioSection() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const terms = (t.glosario?.terms ?? []) as Term[];
  const filtered = terms.filter(
    (item) =>
      item.term.toLowerCase().includes(query.toLowerCase()) ||
      item.definition.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <section
      id="glosario"
      ref={ref}
      style={{ background: "#0A1F3D", padding: "0 0 160px" }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "128px 24px" }}>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          style={{ marginBottom: "60px" }}
        >
          <p style={{ fontSize: "11px", letterSpacing: "0.22em", color: "rgba(240,180,100,0.5)", textTransform: "uppercase", marginBottom: "16px" }}>
            {t.glosario?.label ?? "GLOSARIO OPERATIVO"}
          </p>
          <h2 style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(28px,4vw,46px)", fontWeight: 400, color: "#E0D0B0", margin: "0 0 16px", lineHeight: 1.15 }}>
            {t.glosario?.title ?? "El idioma del comercio real."}
          </h2>
          <p style={{ fontSize: "14px", color: "rgba(180,165,130,0.55)", margin: 0 }}>
            {t.glosario?.sub ?? "Cada término con su definición, contexto y ejemplo práctico."}
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.2 }}
          style={{ position: "relative", marginBottom: "32px" }}
        >
          <input
            type="text"
            placeholder={t.glosario?.search ?? "Buscar término..."}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setExpanded(null); }}
            style={{
              width: "100%", padding: "14px 48px 14px 20px",
              background: "rgba(5,15,35,0.6)",
              border: "1px solid rgba(212,180,120,0.2)",
              borderRadius: "2px", color: "#E0D0B0", fontSize: "14px",
              outline: "none", fontFamily: "inherit", boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(212,180,120,0.5)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(212,180,120,0.2)")}
          />
          <span style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "rgba(212,180,120,0.35)", pointerEvents: "none" }}>⌕</span>
        </motion.div>

        <p style={{ fontSize: "11px", color: "rgba(180,165,130,0.3)", letterSpacing: "0.1em", marginBottom: "20px" }}>
          {filtered.length} {filtered.length === 1 ? "término" : "términos"}
        </p>

        {/* Terms */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "rgba(212,180,120,0.06)", border: "1px solid rgba(212,180,120,0.08)", borderRadius: "3px", overflow: "hidden" }}>
          {filtered.map((item) => {
            const isOpen = expanded === item.term;
            return (
              <div
                key={item.term}
                style={{
                  background: isOpen ? "rgba(5,15,35,0.7)" : "#0A1F3D",
                  borderLeft: isOpen ? "2px solid rgba(240,180,100,0.5)" : "2px solid transparent",
                  transition: "all 0.2s",
                }}
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : item.term)}
                  style={{
                    width: "100%", padding: "20px 28px", background: "none", border: "none",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: "16px", minWidth: 0 }}>
                    <span style={{ fontFamily: "'Georgia', serif", fontSize: "15px", fontWeight: 700, color: isOpen ? "#D4B478" : "rgba(212,180,120,0.8)", whiteSpace: "nowrap", letterSpacing: "0.04em" }}>
                      {item.term}
                    </span>
                    {!isOpen && (
                      <span style={{ fontSize: "12px", color: "rgba(180,165,130,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.definition}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "14px", color: "rgba(212,180,120,0.4)", flexShrink: 0, transition: "transform 0.2s", transform: isOpen ? "rotate(45deg)" : "rotate(0)" }}>+</span>
                </button>

                {isOpen && (
                  <div style={{ padding: "0 28px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    <div>
                      <p style={{ fontSize: "10px", letterSpacing: "0.15em", color: "rgba(212,180,120,0.35)", textTransform: "uppercase", marginBottom: "6px" }}>Definición</p>
                      <p style={{ fontSize: "13px", color: "rgba(220,210,185,0.8)", lineHeight: 1.6, margin: 0 }}>{item.definition}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: "10px", letterSpacing: "0.15em", color: "rgba(212,180,120,0.35)", textTransform: "uppercase", marginBottom: "6px" }}>Contexto</p>
                      <p style={{ fontSize: "13px", color: "rgba(180,165,130,0.65)", lineHeight: 1.6, margin: "0 0 16px" }}>{item.context}</p>
                      <p style={{ fontSize: "10px", letterSpacing: "0.15em", color: "rgba(74,240,196,0.35)", textTransform: "uppercase", marginBottom: "6px" }}>Ejemplo</p>
                      <p style={{ fontSize: "13px", color: "rgba(74,240,196,0.6)", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>{item.example}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: "40px", textAlign: "center", color: "rgba(180,165,130,0.4)", fontSize: "13px" }}>
              No se encontraron términos para "{query}"
            </div>
          )}
        </div>
      </div>
    </section>
  );
}


