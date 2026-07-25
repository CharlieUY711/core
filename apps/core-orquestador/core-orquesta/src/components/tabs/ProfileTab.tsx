import {
  Building2, TrendingUp, Users, Globe, Package, Award,
  Sparkles, AlertTriangle, MapPin, Cpu, GitBranch,
  ChevronRight,
} from "lucide-react";
import type { Company, OrchestratorEvent } from "../../data";

const VERTICAL_ICONS: Record<string, React.ElementType> = {
  trending: TrendingUp, globe: Globe, users: Users,
  package: Package, award: Award, alert: AlertTriangle,
};

const COLOR_MAP: Record<string, {
  outer: string; inner: string; text: string; border: string;
  iconBg: string; iconBorder: string; dot: string;
}> = {
  blue:    { outer: "bg-blue-50",    inner: "bg-blue-100/50",   text: "text-blue-800",    border: "border-blue-200",    iconBg: "bg-blue-100",    iconBorder: "border-blue-200",    dot: "bg-blue-500" },
  emerald: { outer: "bg-emerald-50", inner: "bg-emerald-100/50",text: "text-emerald-800", border: "border-emerald-200", iconBg: "bg-emerald-100", iconBorder: "border-emerald-200", dot: "bg-emerald-500" },
  violet:  { outer: "bg-violet-50",  inner: "bg-violet-100/50", text: "text-violet-800",  border: "border-violet-200",  iconBg: "bg-violet-100",  iconBorder: "border-violet-200",  dot: "bg-violet-500" },
  amber:   { outer: "bg-amber-50",   inner: "bg-amber-100/50",  text: "text-amber-800",   border: "border-amber-200",   iconBg: "bg-amber-100",   iconBorder: "border-amber-200",   dot: "bg-amber-500" },
  rose:    { outer: "bg-rose-50",    inner: "bg-rose-100/50",   text: "text-rose-800",    border: "border-rose-200",    iconBg: "bg-rose-100",    iconBorder: "border-rose-200",    dot: "bg-rose-500" },
  red:     { outer: "bg-red-50",     inner: "bg-red-100/50",    text: "text-red-800",     border: "border-red-200",     iconBg: "bg-red-100",     iconBorder: "border-red-200",     dot: "bg-red-500" },
  slate:   { outer: "bg-slate-100",  inner: "bg-slate-200/50",  text: "text-slate-700",   border: "border-slate-200",   iconBg: "bg-slate-200",   iconBorder: "border-slate-300",   dot: "bg-slate-400" },
  cyan:    { outer: "bg-cyan-50",    inner: "bg-cyan-100/50",   text: "text-cyan-800",    border: "border-cyan-200",    iconBg: "bg-cyan-100",    iconBorder: "border-cyan-200",    dot: "bg-cyan-500" },
};

const EVENT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  expansion:  { bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500" },
  financiero: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  talento:    { bg: "bg-violet-100",  text: "text-violet-700",  dot: "bg-violet-500" },
  producto:   { bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-500" },
  alianza:    { bg: "bg-cyan-100",    text: "text-cyan-700",    dot: "bg-cyan-500" },
  riesgo:     { bg: "bg-red-100",     text: "text-red-700",     dot: "bg-red-500" },
};

export function ProfileTab({ company, events }: { company: Company; events: OrchestratorEvent[] }) {
  return (
    <div className="space-y-5">

      {/* ── Company header card ─────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-gradient-to-br from-[#0B1120] via-blue-950/80 to-[#111827] px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center shadow-inner">
                <Building2 className="w-7 h-7 text-white/90" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base leading-tight">{company.name}</h3>
                <p className="text-blue-200/80 text-xs mt-0.5 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />
                  {company.location}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">{company.industry}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                company.activity === "high"   ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                company.activity === "medium" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                "bg-slate-500/20 text-slate-300 border-slate-500/30"
              }`}>
                {company.activity === "high" ? "● Alta actividad" : company.activity === "medium" ? "◐ Actividad media" : "○ Baja actividad"}
              </span>
              <span className="text-[10px] text-slate-500">{company.size}</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white px-5 py-4 border-t border-slate-200">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-blue-100 border border-blue-200 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">{company.summary}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 grid grid-cols-3 divide-x divide-slate-200">
          {[
            { icon: Cpu,       label: "Motores activos",  value: "3" },
            { icon: GitBranch, label: "Señales totales",  value: "4" },
            { icon: Globe,     label: "Fuentes activas",  value: "12" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="px-4 first:pl-0 last:pr-0 flex items-center gap-2">
              <div className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div>
                <p className="text-slate-900 font-bold text-sm">{value}</p>
                <p className="text-[10px] text-slate-400">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Verticals ───────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-[2px] w-6 rounded-full bg-gradient-to-r from-blue-600 to-violet-600" />
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Verticales monitoreadas
          </h4>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {company.verticals.map((v) => {
            const Icon = VERTICAL_ICONS[v.icon] || Globe;
            const c = COLOR_MAP[v.color] || COLOR_MAP.slate;
            return (
              <div key={v.label}
                className={`p-3.5 rounded-2xl border ${c.outer} ${c.border} hover:shadow-sm transition-all cursor-default group`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center border ${c.iconBg} ${c.iconBorder}`}>
                    <Icon className={`w-3.5 h-3.5 ${c.text}`} />
                  </div>
                  <span className={`text-[11px] font-bold ${c.text}`}>{v.label}</span>
                </div>
                <p className={`text-[11px] leading-snug ${c.text} opacity-80 font-medium`}>{v.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Timeline ────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-[2px] w-6 rounded-full bg-gradient-to-r from-blue-600 to-violet-600" />
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Timeline de eventos relevantes
          </h4>
        </div>
        {events.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-slate-200">
              <Globe className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-sm text-slate-400">Sin eventos para esta empresa</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-5 bottom-5 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />
            <div className="space-y-3">
              {events.slice(0, 6).map((ev) => {
                const ec = EVENT_COLORS[ev.type] || EVENT_COLORS.riesgo;
                return (
                  <div key={ev.id} className="flex items-start gap-3.5">
                    <div className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border-2 border-white shadow-sm ${ec.dot}`}>
                      <span className="text-white text-[10px] font-bold uppercase">{ev.type.slice(0, 2)}</span>
                    </div>
                    <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm hover:shadow-md transition-shadow group">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-800 leading-snug flex-1">{ev.description}</p>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5 group-hover:text-slate-400 transition-colors" />
                      </div>
                      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        <span className="text-[10px] font-mono text-slate-400">{ev.date}</span>
                        <span className="text-slate-200">·</span>
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
                          {ev.motorName}
                        </span>
                        <span className={`text-[10px] font-semibold capitalize px-2 py-0.5 rounded-full border ${ec.bg} ${ec.text}`}>
                          {ev.type}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
