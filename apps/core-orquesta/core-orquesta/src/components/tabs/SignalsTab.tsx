import { useState } from "react";
import {
  Zap, CheckCircle2, MinusCircle, Clock,
  Rss, Globe, TrendingUp, ArrowUpRight,
  AlertTriangle, AlertCircle, Info,
} from "lucide-react";
import type { Signal, SignalStatus } from "../../data";

const MOTOR_ICONS: Record<string, React.ElementType> = {
  rss: Rss, globe: Globe, trending: TrendingUp,
};

const PRIORITY_CFG = {
  alta:  {
    label: "Alta",
    strip: "bg-red-500",
    badge: "bg-red-50 text-red-700 border-red-200",
    icon: AlertTriangle,
    iconColor: "text-red-600",
  },
  media: {
    label: "Media",
    strip: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    icon: AlertCircle,
    iconColor: "text-amber-600",
  },
  baja:  {
    label: "Baja",
    strip: "bg-slate-300",
    badge: "bg-slate-100 text-slate-500 border-slate-200",
    icon: Info,
    iconColor: "text-slate-400",
  },
};

const STATUS_CFG: Record<SignalStatus, {
  label: string; icon: React.ElementType;
  badge: string; dotColor: string; dotPulse: boolean;
}> = {
  nueva:     { label: "Nueva",     icon: Zap,         badge: "bg-blue-100 text-blue-700 border-blue-200",       dotColor: "bg-blue-500",    dotPulse: true },
  procesada: { label: "Procesada", icon: CheckCircle2, badge: "bg-emerald-100 text-emerald-700 border-emerald-200", dotColor: "bg-emerald-500", dotPulse: false },
  ignorada:  { label: "Ignorada",  icon: MinusCircle,  badge: "bg-slate-100 text-slate-400 border-slate-200",    dotColor: "bg-slate-300",   dotPulse: false },
};

export function SignalsTab({ signals }: { signals: Signal[] }) {
  const [filter, setFilter] = useState<SignalStatus | "todas">("todas");

  const filtered  = filter === "todas" ? signals : signals.filter((s) => s.status === filter);
  const newCount  = signals.filter((s) => s.status === "nueva").length;
  const altaCount = signals.filter((s) => s.priority === "alta").length;
  const procCount = signals.filter((s) => s.status === "procesada").length;

  return (
    <div className="space-y-4">

      {/* ── Stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{signals.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Total señales</p>
        </div>
        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-4 shadow-sm">
          <p className="text-2xl font-bold text-blue-600">{newCount}</p>
          <p className="text-[11px] text-blue-600/70 mt-0.5">Nuevas</p>
        </div>
        <div className="bg-red-50 rounded-2xl border border-red-200 p-4 shadow-sm">
          <p className="text-2xl font-bold text-red-600">{altaCount}</p>
          <p className="text-[11px] text-red-600/70 mt-0.5">Alta prioridad</p>
        </div>
      </div>

      {/* ── Filter pills ────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
        {(["todas", "nueva", "procesada", "ignorada"] as const).map((f) => {
          const count = f === "todas" ? signals.length : signals.filter((s) => s.status === f).length;
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize
                ${filter === f ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>
              {f !== "todas" && (
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_CFG[f]?.dotColor ?? "bg-slate-400"}`} />
              )}
              {f === "todas" ? "Todas" : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className={`text-[10px] font-mono ${filter === f ? "text-white/70" : "text-slate-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Signal list ─────────────────────────────────────────── */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-slate-200">
              <Zap className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-sm text-slate-400">Sin señales en este estado</p>
          </div>
        ) : filtered.map((signal) => {
          const p = PRIORITY_CFG[signal.priority];
          const s = STATUS_CFG[signal.status];
          const StatusIcon = s.icon;
          const PriorityIcon = p.icon;
          const MotorIcon = MOTOR_ICONS[signal.motorIcon] || Globe;

          return (
            <div key={signal.id}
              className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all hover:-translate-y-[1px]
                ${signal.status === "ignorada" ? "opacity-60" : ""}
              `}>
              {/* Priority strip */}
              <div className={`h-[3px] ${p.strip}`} />

              <div className="p-4">
                {/* Top row: badges + action */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${p.badge}`}>
                      <PriorityIcon className={`w-3 h-3 ${p.iconColor}`} />
                      {p.label}
                    </span>
                    <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${s.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dotColor} ${s.dotPulse ? "animate-pulse" : ""}`} />
                      {s.label}
                    </span>
                  </div>
                  <button className="shrink-0 w-7 h-7 flex items-center justify-center text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-transparent hover:border-blue-200">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Title + desc */}
                <h5 className={`text-sm font-bold text-slate-800 leading-snug mb-1.5 ${signal.status === "ignorada" ? "line-through" : ""}`}>
                  {signal.title}
                </h5>
                <p className="text-xs text-slate-500 leading-relaxed">{signal.description}</p>

                {/* Footer meta */}
                <div className="flex items-center gap-2.5 mt-3.5 pt-3 border-t border-slate-100 flex-wrap">
                  <span className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                    <MotorIcon className="w-3 h-3" />
                    {signal.motor}
                  </span>
                  <span className="text-[10px] text-slate-400">{signal.source}</span>
                  <span className="flex items-center gap-1 text-[10px] text-slate-400 ml-auto">
                    <Clock className="w-3 h-3" />
                    {signal.time}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
