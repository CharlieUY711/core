import { useState, useCallback, useEffect } from "react";
import { User, Zap, CalendarDays, FileText, GitBranch, ChevronDown, Building2, MapPin, Briefcase, Users } from "lucide-react";
import { ProfileTab } from "./tabs/ProfileTab";
import { SignalsTab } from "./tabs/SignalsTab";
import { EventsTab } from "./tabs/EventsTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { RelationsTab } from "./tabs/RelationsTab";
import type { Company, Signal, OrchestratorEvent } from "../data";

type TabId = "perfil" | "señales" | "eventos" | "documentos" | "relaciones";
interface Tab { id: TabId; label: string; icon: React.ElementType; badgeCount?: number; }

interface RightPanelProps {
  companies: Company[];
  selectedCompanyId: string;
  onSelectCompany: (id: string) => void;
  signals: Signal[];
  events: OrchestratorEvent[];
}

const ACTIVITY_DOT: Record<string, string> = {
  high: "bg-emerald-500 animate-pulse", medium: "bg-amber-500", low: "bg-slate-400",
};
const ACTIVITY_LABEL: Record<string, { text: string; badge: string }> = {
  high:   { text: "Alta actividad",  badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  medium: { text: "Actividad media", badge: "bg-amber-100 text-amber-700 border-amber-200" },
  low:    { text: "Baja actividad",  badge: "bg-slate-100 text-slate-500 border-slate-200" },
};

export function RightPanel({
  companies, selectedCompanyId, onSelectCompany, signals, events,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("perfil");
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);
  const [displayTab, setDisplayTab] = useState<TabId>("perfil");
  const [displayCompanyId, setDisplayCompanyId] = useState(selectedCompanyId);

  const fadeOut = useCallback((callback: () => void) => {
    setContentVisible(false);
    setTimeout(() => { callback(); setContentVisible(true); }, 160);
  }, []);

  const handleTabChange = useCallback((tab: TabId) => {
    if (tab === displayTab) return;
    fadeOut(() => setDisplayTab(tab));
    setActiveTab(tab);
  }, [displayTab, fadeOut]);

  const handleCompanyChange = useCallback((id: string) => {
    if (id === displayCompanyId) return;
    setShowCompanyMenu(false);
    fadeOut(() => { setDisplayCompanyId(id); onSelectCompany(id); });
  }, [displayCompanyId, onSelectCompany, fadeOut]);

  useEffect(() => {
    if (selectedCompanyId !== displayCompanyId) fadeOut(() => setDisplayCompanyId(selectedCompanyId));
  }, [selectedCompanyId]);

  const company = companies.find((c) => c.id === displayCompanyId) ?? companies[0];
  const companySignals = signals.filter((s) => s.companyId === displayCompanyId);
  const companyEvents  = events.filter((e) => e.companyId === displayCompanyId);
  const newSignals = companySignals.filter((s) => s.status === "nueva").length;
  const act = ACTIVITY_LABEL[company.activity];

  const tabs: Tab[] = [
    { id: "perfil",      label: "Perfil",      icon: User },
    { id: "señales",     label: "Señales",      icon: Zap,          badgeCount: newSignals },
    { id: "eventos",     label: "Eventos",      icon: CalendarDays },
    { id: "documentos",  label: "Documentos",   icon: FileText },
    { id: "relaciones",  label: "Relaciones",   icon: GitBranch },
  ];

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      {/* ── Panel Header ──────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-slate-200">

        {/* Top row: title + company selector */}
        <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-6 h-6 bg-blue-100 border border-blue-200 rounded-lg flex items-center justify-center">
                <FileText className="w-3 h-3 text-blue-600" />
              </div>
              <h2 className="text-slate-900 font-bold text-sm">Generador de Contexto</h2>
            </div>
            <p className="text-slate-400 text-[11px] pl-8">Inteligencia y documentación automática</p>
          </div>

          {/* Company selector */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowCompanyMenu(!showCompanyMenu)}
              className="flex items-center gap-2.5 pl-3 pr-2.5 py-2 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all shadow-sm"
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${ACTIVITY_DOT[company.activity]}`} />
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-800">{company.name}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showCompanyMenu ? "rotate-180" : ""}`} />
            </button>

            {showCompanyMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowCompanyMenu(false)} />
                <div className="absolute right-0 top-full mt-2 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl min-w-[260px] overflow-hidden anim-fade-in">
                  <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Seleccionar empresa</p>
                  </div>
                  <div className="py-1">
                    {companies.map((c) => {
                      const a = ACTIVITY_LABEL[c.activity];
                      return (
                        <button key={c.id} onClick={() => handleCompanyChange(c.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${c.id === displayCompanyId ? "bg-blue-50/60" : ""}`}>
                          <div className="w-8 h-8 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-slate-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold truncate ${c.id === displayCompanyId ? "text-blue-700" : "text-slate-800"}`}>
                              {c.name}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{c.industry} · {c.location}</p>
                          </div>
                          <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${a.badge}`}>
                            {c.activity === "high" ? "●" : c.activity === "medium" ? "◐" : "○"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Company info strip */}
        <div className="px-5 pb-3 flex items-center gap-3 text-[11px] text-slate-400">
          <MapPin className="w-3 h-3 shrink-0" />
          <span>{company.location}</span>
          <span className="text-slate-200">·</span>
          <Briefcase className="w-3 h-3 shrink-0" />
          <span>{company.industry}</span>
          <span className="text-slate-200">·</span>
          <Users className="w-3 h-3 shrink-0" />
          <span>{company.size}</span>
          <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full border ${act.badge}`}>
            {act.text}
          </span>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────── */}
        <div className="px-5 flex items-center gap-0.5 overflow-x-auto pb-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all
                  ${isActive
                    ? "border-b-blue-600 text-blue-600"
                    : "border-b-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.badgeCount != null && tab.badgeCount > 0 && (
                  <span className={`min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[10px] font-bold
                    ${isActive ? "bg-blue-100 text-blue-700" : "bg-red-500 text-white"}`}>
                    {tab.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ───────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto bg-[#F7F8FA]"
        style={{
          opacity: contentVisible ? 1 : 0,
          transform: contentVisible ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 0.18s ease-out, transform 0.18s ease-out",
        }}
      >
        <div className="px-5 py-5 max-w-none">
          {displayTab === "perfil"      && <ProfileTab   company={company} events={companyEvents} />}
          {displayTab === "señales"     && <SignalsTab    signals={companySignals} />}
          {displayTab === "eventos"     && <EventsTab     events={companyEvents} />}
          {displayTab === "documentos"  && <DocumentsTab  company={company} />}
          {displayTab === "relaciones"  && <RelationsTab  company={company} />}
        </div>
      </div>
    </div>
  );
}
