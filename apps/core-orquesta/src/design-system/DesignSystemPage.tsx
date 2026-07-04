import { useState, useRef } from "react";
import { ArrowLeft, Search, ExternalLink, ChevronRight } from "lucide-react";
import { DS_NAV } from "./ds-tokens";
import {
  IdentitySection, ColorsSection, TypographySection,
  SpacingSection, ElevationSection,
} from "./sections/FoundationSections";
import { IconSection } from "./sections/IconSection";
import {
  ButtonSection, InputSection, CardSection, ModalSection,
  TabSection, TableSection, TimelineSection, AlertSection, ConsoleSection,
} from "./sections/ComponentSections";
import {
  MotorStatesSection, DocStatesSection, SignalStatesSection,
} from "./sections/SystemSections";

interface DesignSystemPageProps { onBack: () => void; }

export function DesignSystemPage({ onBack }: DesignSystemPageProps) {
  const [activeSection, setActiveSection] = useState("identity");
  const [search, setSearch] = useState("");
  const mainRef = useRef<HTMLDivElement>(null);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(id);
    }
  };

  const allItems = DS_NAV.flatMap((g) => g.items);
  const filteredNav = search
    ? DS_NAV.map((g) => ({
        ...g,
        items: g.items.filter((i) => i.label.toLowerCase().includes(search.toLowerCase())),
      })).filter((g) => g.items.length > 0)
    : DS_NAV;

  return (
    <div className="flex h-screen bg-white overflow-hidden" style={{ fontFamily: "Inter, -apple-system, sans-serif" }}>

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <div className="w-[240px] shrink-0 flex flex-col bg-[#0B1120] border-r border-white/[0.06] overflow-hidden">
        {/* Sidebar header */}
        <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="3" fill="white" />
                <path d="M10 2L10 6M10 14L10 18M2 10L6 10M14 10L18 10" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-xs leading-none">Orquestador</p>
              <p className="text-blue-400 text-[9px] font-semibold uppercase tracking-wider mt-0.5">Design System</p>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
            <input type="text" placeholder="Buscar componente…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 bg-white/[0.06] border border-white/[0.08] rounded-lg text-[11px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all" />
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {filteredNav.map((group) => (
            <div key={group.group} className="mb-4">
              <div className="flex items-center gap-1.5 px-2 py-1.5 mb-0.5">
                <span className="text-blue-500 text-[10px] font-mono">{group.emoji}</span>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.12em]">{group.group}</p>
              </div>
              {group.items.map((item) => (
                <button key={item.id} onClick={() => scrollTo(item.id)}
                  className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-medium transition-all group mb-0.5
                    ${activeSection === item.id
                      ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
                    }`}>
                  {item.label}
                  <ChevronRight className={`w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity ${activeSection === item.id ? "opacity-60" : ""}`} />
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Back to dashboard */}
        <div className="shrink-0 p-3 border-t border-white/[0.06]">
          <button onClick={onBack}
            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] rounded-lg transition-all">
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al Dashboard
          </button>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <div className="shrink-0 bg-white border-b border-slate-200 px-8 py-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={onBack}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Dashboard
            </button>
            <span className="text-slate-200">/</span>
            <h1 className="text-sm font-bold text-slate-800">Orquestador Design System</h1>
            <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 font-semibold">v2.4</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {allItems.length} secciones
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Inter · Lucide
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                Tailwind v4
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div ref={mainRef} className="flex-1 overflow-y-auto">
          <div className="max-w-[1100px] mx-auto px-8 pb-16">

            {/* Hero */}
            <div className="py-10 mb-2">
              <div className="bg-gradient-to-br from-[#0B1120] to-[#1A2332] rounded-3xl p-8 border border-white/[0.06] overflow-hidden relative">
                <div className="absolute inset-0 overflow-hidden">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="absolute rounded-full"
                      style={{
                        width: `${Math.random() * 200 + 50}px`,
                        height: `${Math.random() * 200 + 50}px`,
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        background: i % 3 === 0 ? "rgba(37,99,235,0.08)" : i % 3 === 1 ? "rgba(16,185,129,0.05)" : "rgba(124,58,237,0.06)",
                        transform: "translate(-50%,-50%)",
                      }} />
                  ))}
                </div>
                <div className="relative z-10">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full uppercase tracking-widest">
                          Design System
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">versión 2.4.0</span>
                      </div>
                      <h1 className="text-white font-extrabold mb-3" style={{ fontSize: "2.25rem", lineHeight: "1.15" }}>
                        Orquestador<br />Design System
                      </h1>
                      <p className="text-slate-400 max-w-lg leading-relaxed text-sm">
                        Sistema de diseño modular para el dashboard de Orquestador. Tokens semánticos, 
                        componentes reutilizables y patrones de interacción documentados.
                      </p>
                    </div>
                    <div className="hidden lg:grid grid-cols-2 gap-3">
                      {[
                        { n: "7",  l: "grupos de color" },
                        { n: "60+",l: "íconos" },
                        { n: "15", l: "componentes" },
                        { n: "18", l: "estados" },
                      ].map(({ n, l }) => (
                        <div key={l} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3 text-center min-w-[90px]">
                          <p className="text-white font-extrabold text-2xl">{n}</p>
                          <p className="text-slate-500 text-[10px] mt-0.5 leading-tight">{l}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-6">
                    {DS_NAV.flatMap((g) => g.items).slice(0, 10).map((item) => (
                      <button key={item.id} onClick={() => scrollTo(item.id)}
                        className="text-[11px] text-slate-400 bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-slate-200 transition-all font-medium">
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* All sections */}
            <IdentitySection />
            <ColorsSection />
            <TypographySection />
            <SpacingSection />
            <ElevationSection />
            <IconSection />
            <ButtonSection />
            <InputSection />
            <CardSection />
            <ModalSection />
            <TabSection />
            <TableSection />
            <TimelineSection />
            <AlertSection />
            <ConsoleSection />
            <MotorStatesSection />
            <DocStatesSection />
            <SignalStatesSection />

            {/* Footer */}
            <div className="py-10 mt-6 border-t border-slate-200 text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="3" fill="white" />
                    <path d="M10 2L10 6M10 14L10 18M2 10L6 10M14 10L18 10" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-slate-800 font-bold">Orquestador Design System</p>
              </div>
              <p className="text-slate-400 text-xs">
                orquestador.core.com.uy — Módulo de Charlie · v2.4.0 · Inter · Lucide React · Tailwind CSS v4
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
