import {
  COLOR_GROUPS, TYPE_SCALE, SPACING_SCALE, RADIUS_SCALE, ELEVATION_SCALE,
} from "../ds-tokens";
import {
  DSSection, DSSectionHeader, PreviewCard, DSGrid, TokenLabel, SpecRow,
} from "../DSHelpers";

// ════════════════════════════════════════════════════════════════════
//  IDENTITY VISUAL
// ════════════════════════════════════════════════════════════════════
export function IdentitySection() {
  return (
    <DSSection id="identity">
      <DSSectionHeader
        title="Identidad Visual"
        subtitle="Personalidad: precisión, claridad, inteligencia y control. Estilo: moderno, técnico, modular."
      />
      {/* Logo */}
      <PreviewCard title="Logotipo & Brand">
        <div className="flex flex-wrap gap-8 items-center">
          {/* Dark version */}
          <div className="flex items-center gap-3 bg-[#0B1120] px-6 py-4 rounded-xl border border-slate-800">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 bg-blue-600 rounded-xl opacity-20 animate-pulse" />
              <div className="relative w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/40">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="3" fill="white" />
                  <path d="M10 2 L10 6 M10 14 L10 18 M2 10 L6 10 M14 10 L18 10" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M4.22 4.22 L7.05 7.05 M12.95 12.95 L15.78 15.78 M15.78 4.22 L12.95 7.05 M7.05 12.95 L4.22 15.78" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-white font-bold text-lg tracking-tight">Orquestador</p>
              <p className="text-[10px] text-blue-400 uppercase tracking-[0.15em] font-semibold">Intelligence Suite</p>
            </div>
          </div>
          {/* Light version */}
          <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-xl border border-slate-200">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/30">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="3" fill="white" />
                <path d="M10 2 L10 6 M10 14 L10 18 M2 10 L6 10 M14 10 L18 10" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M4.22 4.22 L7.05 7.05 M12.95 12.95 L15.78 15.78 M15.78 4.22 L12.95 7.05 M7.05 12.95 L4.22 15.78" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-slate-900 font-bold text-lg tracking-tight">Orquestador</p>
              <p className="text-[10px] text-blue-600 uppercase tracking-[0.15em] font-semibold">Intelligence Suite</p>
            </div>
          </div>
          {/* Icon only */}
          <div className="flex gap-3 items-center">
            {["w-10 h-10 rounded-xl", "w-12 h-12 rounded-xl", "w-16 h-16 rounded-2xl"].map((sz, i) => (
              <div key={i} className={`${sz} bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/30`}>
                <svg width={i === 2 ? 28 : i === 1 ? 22 : 18} height={i === 2 ? 28 : i === 1 ? 22 : 18} viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="3" fill="white" />
                  <path d="M10 2 L10 6 M10 14 L10 18 M2 10 L6 10 M14 10 L18 10" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
            ))}
          </div>
        </div>
      </PreviewCard>

      {/* Personality traits */}
      <DSGrid cols={4} gap={4}>
        {[
          { word: "Precisión", desc: "Datos exactos, sin ambigüedad", icon: "◎", color: "blue" },
          { word: "Claridad",  desc: "Legible en cualquier contexto", icon: "◈", color: "violet" },
          { word: "Inteligencia", desc: "IA visible, no invasiva",  icon: "◉", color: "emerald" },
          { word: "Control",   desc: "El usuario siempre manda",    icon: "◆", color: "amber" },
        ].map(({ word, desc, icon, color }) => (
          <div key={word} className={`p-4 rounded-2xl border bg-gradient-to-br
            ${color === "blue"    ? "from-blue-50 to-blue-100/50 border-blue-200" :
              color === "violet"  ? "from-violet-50 to-violet-100/50 border-violet-200" :
              color === "emerald" ? "from-emerald-50 to-emerald-100/50 border-emerald-200" :
              "from-amber-50 to-amber-100/50 border-amber-200"
            }`}>
            <div className={`text-2xl mb-3 font-mono
              ${color === "blue" ? "text-blue-400" : color === "violet" ? "text-violet-400" :
                color === "emerald" ? "text-emerald-400" : "text-amber-400"}`}>{icon}</div>
            <p className="text-slate-900 font-bold text-sm">{word}</p>
            <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
          </div>
        ))}
      </DSGrid>
    </DSSection>
  );
}

// ════════════════════════════════════════════════════════════════════
//  COLORS
// ════════════════════════════════════════════════════════════════════
export function ColorsSection() {
  return (
    <DSSection id="colors">
      <DSSectionHeader
        title="Colores"
        subtitle="Sistema de color semántico. Cada tono tiene un propósito claro dentro del sistema."
        badge="v2.4"
      />
      <div className="space-y-8">
        {COLOR_GROUPS.map((group) => (
          <PreviewCard key={group.name} title={group.name} label={group.token}>
            <div className="flex gap-2 flex-wrap">
              {group.swatches.map((sw) => (
                <div key={sw.shade} className="flex flex-col items-center group">
                  <div
                    className="w-14 h-14 rounded-xl shadow-sm border border-black/[0.06] relative overflow-hidden transition-transform group-hover:scale-105"
                    style={{ background: sw.hex }}
                  >
                    {sw.tag && (
                      <span className="absolute bottom-0 left-0 right-0 text-center text-[8px] font-bold py-0.5"
                        style={{ color: sw.text, background: "rgba(0,0,0,0.15)" }}>
                        {sw.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-semibold text-slate-700 mt-1.5">{sw.shade}</p>
                  <p className="text-[9px] font-mono text-slate-400">{sw.hex}</p>
                </div>
              ))}
            </div>
          </PreviewCard>
        ))}
      </div>
    </DSSection>
  );
}

// ════════════════════════════════════════════════════════════════════
//  TYPOGRAPHY
// ════════════════════════════════════════════════════════════════════
export function TypographySection() {
  return (
    <DSSection id="typography">
      <DSSectionHeader
        title="Tipografía"
        subtitle="Fuente: Inter (Google Fonts). Escala modular basada en 14px base con ratio 1.2."
        badge="Inter"
      />
      <PreviewCard title="Escala tipográfica completa">
        <div className="space-y-0 divide-y divide-slate-100">
          {TYPE_SCALE.map((t) => (
            <div key={t.name} className="py-4 grid grid-cols-[140px_1fr_auto] gap-6 items-baseline">
              <div>
                <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">{t.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono text-slate-400">{t.size}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-[10px] font-mono text-slate-400">w{t.weight}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-[10px] font-mono text-slate-400">lh{t.lineHeight}</span>
                </div>
              </div>
              <p className="text-slate-800 leading-normal truncate"
                style={{
                  fontSize: t.size,
                  fontWeight: t.weight,
                  lineHeight: t.lineHeight,
                  letterSpacing: t.letterSpacing,
                  fontFamily: t.mono ? "'Fira Code', 'JetBrains Mono', Consolas, monospace" : "inherit",
                }}>
                {t.sample}
              </p>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md whitespace-nowrap">
                {t.remSize}
              </span>
            </div>
          ))}
        </div>
      </PreviewCard>

      <DSGrid cols={3} gap={4}>
        <PreviewCard title="Familias de Fuente">
          <div className="space-y-4">
            {[
              { label: "Sans-serif (UI)", css: "'Inter', sans-serif", sample: "El Orquestador procesa señales" },
              { label: "Monospace (Logs)", css: "'JetBrains Mono', monospace", sample: "[LOG] ✓ Señal procesada" },
              { label: "System fallback", css: "-apple-system, BlinkMacSystemFont", sample: "Sistema operativo nativo" },
            ].map(({ label, css, sample }) => (
              <div key={label} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm" style={{ fontFamily: css }}>{sample}</p>
                <p className="text-[10px] font-mono text-slate-400 mt-1">{css.split(",")[0]}</p>
              </div>
            ))}
          </div>
        </PreviewCard>
        <PreviewCard title="Pesos">
          <div className="space-y-3">
            {[300, 400, 500, 600, 700].map((w) => (
              <div key={w} className="flex items-baseline justify-between">
                <span style={{ fontWeight: w }} className="text-slate-800">
                  {w === 300 ? "Light" : w === 400 ? "Regular" : w === 500 ? "Medium" : w === 600 ? "SemiBold" : "Bold"}
                </span>
                <span className="text-[10px] font-mono text-slate-400">weight-{w}</span>
              </div>
            ))}
          </div>
        </PreviewCard>
        <PreviewCard title="Colores Tipográficos">
          <div className="space-y-3">
            {[
              { label: "Título principal",  color: "#111827" },
              { label: "Cuerpo de texto",   color: "#374151" },
              { label: "Secundario / muted",color: "#6B7280" },
              { label: "Placeholder",       color: "#9CA3AF" },
              { label: "Disabled",          color: "#D1D5DB" },
              { label: "Enlace / acción",   color: "#2563EB" },
              { label: "Éxito",             color: "#059669" },
              { label: "Error",             color: "#DC2626" },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm" style={{ color }}>{label}</span>
                <span className="text-[10px] font-mono text-slate-400">{color}</span>
              </div>
            ))}
          </div>
        </PreviewCard>
      </DSGrid>
    </DSSection>
  );
}

// ════════════════════════════════════════════════════════════════════
//  SPACING
// ════════════════════════════════════════════════════════════════════
export function SpacingSection() {
  return (
    <DSSection id="spacing">
      <DSSectionHeader
        title="Espaciado"
        subtitle="Sistema de 8pt grid. Todos los espaciados son múltiplos de 4px para consistencia perfecta."
      />
      <PreviewCard title="Escala de espaciado">
        <div className="space-y-4">
          {SPACING_SCALE.map((s) => (
            <div key={s.name} className="flex items-center gap-5">
              <span className="text-[11px] font-mono text-slate-400 w-8 shrink-0">{s.name}</span>
              <div className="flex items-center gap-2 shrink-0 w-[240px]">
                <div className="h-5 rounded-sm bg-gradient-to-r from-blue-500 to-blue-400 shadow-sm opacity-90 transition-all"
                  style={{ width: Math.min(s.px * 3, 240) }} />
                <span className="text-[11px] font-mono text-blue-600 font-semibold">{s.px}px</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">{s.rem}</span>
                <span className="text-xs text-slate-400">{s.use}</span>
              </div>
            </div>
          ))}
        </div>
      </PreviewCard>

      <DSGrid cols={3} gap={4}>
        <PreviewCard title="Radios de borde">
          <div className="flex flex-wrap gap-5 items-end">
            {RADIUS_SCALE.filter((_, i) => i < 6).map((r) => (
              <div key={r.name} className="flex flex-col items-center gap-2">
                <div className={`w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 shadow-md ${r.class}`} />
                <div className="text-center">
                  <p className="text-[10px] font-semibold text-slate-700">{r.px === 9999 ? "full" : `${r.px}px`}</p>
                  <p className="text-[9px] font-mono text-slate-400">{r.class}</p>
                </div>
              </div>
            ))}
          </div>
        </PreviewCard>
        <PreviewCard title="Especificaciones de radio">
          <div className="space-y-0">
            {RADIUS_SCALE.map((r) => (
              <div key={r.name} className="py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">{r.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">{r.px === 9999 ? "9999px" : `${r.px}px`}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{r.use}</p>
              </div>
            ))}
          </div>
        </PreviewCard>
        <PreviewCard title="Grid visual 8pt">
          <div className="relative">
            <div className="grid grid-cols-8 gap-0.5">
              {Array.from({ length: 64 }).map((_, i) => (
                <div key={i} className="h-4 rounded-[1px]"
                  style={{ background: (i % 8 === 0 || i < 8) ? "#DBEAFE" : "#F8FAFC", opacity: 0.8 }} />
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-[10px] font-semibold text-blue-600 bg-white/80 px-2 py-1 rounded-md">8pt grid</p>
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <SpecRow property="Base unit" value="4px" />
            <SpecRow property="Unidad estándar" value="8px" />
            <SpecRow property="Padding mínimo" value="8px" />
            <SpecRow property="Padding estándar" value="16px" />
          </div>
        </PreviewCard>
      </DSGrid>
    </DSSection>
  );
}

// ════════════════════════════════════════════════════════════════════
//  SHADOWS & ELEVATION
// ════════════════════════════════════════════════════════════════════
export function ElevationSection() {
  return (
    <DSSection id="elevation">
      <DSSectionHeader
        title="Sombras & Elevación"
        subtitle="Sistema de elevación de 7 niveles que comunica jerarquía visual mediante sombra y profundidad."
      />
      <PreviewCard title="Escala de elevación">
        <div className="grid grid-cols-4 gap-6 p-4">
          {ELEVATION_SCALE.map((e) => (
            <div key={e.name} className="flex flex-col items-center gap-3">
              <div className={`w-24 h-20 rounded-xl bg-white border border-slate-100 flex items-center justify-center ${e.class}`}>
                <span className="text-2xl font-bold text-slate-200">{e.level}</span>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-700">{e.name}</p>
                <p className="text-[10px] font-mono text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded mt-1">{e.class}</p>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{e.use}</p>
              </div>
            </div>
          ))}
        </div>
      </PreviewCard>

      <DSGrid cols={2} gap={4}>
        <PreviewCard title="Opacidades">
          <div className="flex flex-wrap gap-4 items-center">
            {[10, 20, 40, 60, 80, 100].map((op) => (
              <div key={op} className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-xl bg-blue-600 border border-slate-200"
                  style={{ opacity: op / 100 }} />
                <p className="text-[10px] font-semibold text-slate-700">{op}%</p>
                <p className="text-[9px] font-mono text-slate-400">opacity-{op}</p>
              </div>
            ))}
          </div>
        </PreviewCard>
        <PreviewCard title="Bordes">
          <div className="space-y-3">
            {[
              { name: "border",   width: "1px",  class: "border border-slate-300",      use: "Elementos estándar" },
              { name: "border-2", width: "2px",  class: "border-2 border-slate-300",    use: "Foco, seleccionado" },
              { name: "border-4", width: "4px",  class: "border-4 border-slate-300",    use: "Énfasis, advertencia" },
              { name: "ring-2",   width: "2px",  class: "ring-2 ring-blue-500",         use: "Focus ring, inputs" },
            ].map(({ name, width, class: cls, use }) => (
              <div key={name} className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg bg-white ${cls}`} />
                <div>
                  <p className="text-xs font-semibold text-slate-700">{name} <span className="font-mono text-slate-400">({width})</span></p>
                  <p className="text-[10px] text-slate-400">{use}</p>
                </div>
              </div>
            ))}
          </div>
        </PreviewCard>
      </DSGrid>
    </DSSection>
  );
}
