import {
  Settings, Power, Clock, AlertCircle, CheckCircle2, XCircle,
  Rss, Globe, Database, Mail, TrendingUp, Search, Zap,
} from "lucide-react";
import type { Motor, MotorStatus } from "../data";

// ── Icon registry ─────────────────────────────────────────────────
export const MOTOR_ICONS: Record<string, React.ElementType> = {
  rss: Rss, globe: Globe, database: Database, mail: Mail,
  trending: TrendingUp, search: Search, zap: Zap,
};

// ── Status tokens ─────────────────────────────────────────────────
export const STATUS_CFG: Record<MotorStatus, {
  label: string; dot: string; dotPulse: boolean;
  badge: string; accent: string; iconBg: string; iconColor: string;
}> = {
  active: {
    label: "Activo", dot: "bg-emerald-500", dotPulse: true,
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    accent: "border-l-emerald-500",
    iconBg: "bg-emerald-50 border-emerald-200", iconColor: "text-emerald-600",
  },
  inactive: {
    label: "Inactivo", dot: "bg-slate-400", dotPulse: false,
    badge: "bg-slate-100 text-slate-500 border-slate-200",
    accent: "border-l-slate-300",
    iconBg: "bg-slate-50 border-slate-200", iconColor: "text-slate-400",
  },
  error: {
    label: "Error", dot: "bg-red-500", dotPulse: true,
    badge: "bg-red-50 text-red-700 border-red-200",
    accent: "border-l-red-500",
    iconBg: "bg-red-50 border-red-200", iconColor: "text-red-500",
  },
};

const LOG_COLOR = (text: string) =>
  text.startsWith("✓") ? "text-emerald-400" :
  text.startsWith("✗") ? "text-red-400" :
  text.startsWith("⚠") ? "text-amber-400" :
  text.startsWith("↻") ? "text-blue-400" : "text-slate-400";

interface MotorCardProps {
  motor: Motor;
  selected: boolean;
  onSelect: (id: string) => void;
  onConfigure: (motor: Motor) => void;
  onToggle: (id: string) => void;
}

export function MotorCard({ motor, selected, onSelect, onConfigure, onToggle }: MotorCardProps) {
  const cfg = STATUS_CFG[motor.status];
  const Icon = MOTOR_ICONS[motor.icon] || Globe;

  return (
    <div
      onClick={() => onSelect(motor.id)}
      className={`
        group rounded-2xl border-l-[3px] border border-r border-t border-b
        cursor-pointer transition-all duration-200
        ${cfg.accent}
        ${selected
          ? "bg-blue-50/60 border-r-blue-200 border-t-blue-200 border-b-blue-200 shadow-md shadow-blue-100/60 ring-2 ring-blue-300/30"
          : "bg-white border-r-slate-200 border-t-slate-200 border-b-slate-200 shadow-sm hover:shadow-md hover:border-r-slate-300 hover:-translate-y-[1px]"
        }
      `}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Icon */}
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${cfg.iconBg}`}>
            <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
          </div>
          {/* Name + desc */}
          <div className="min-w-0">
            <h4 className="text-slate-900 font-semibold text-sm truncate">{motor.name}</h4>
            <p className="text-slate-400 text-[11px] truncate mt-0.5">{motor.description}</p>
          </div>
        </div>

        {/* Status badge */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 ${cfg.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot} ${cfg.dotPulse ? "animate-pulse" : ""}`} />
          {cfg.label}
        </div>
      </div>

      {/* ── Metadata ────────────────────────────────────────────── */}
      <div className="px-4 pb-3 flex items-center gap-2 text-[11px] text-slate-400">
        <Clock className="w-3 h-3 shrink-0" />
        <span>Última ejecución: <span className="text-slate-600 font-medium">{motor.lastRun}</span></span>
        <span className="ml-auto text-[10px] font-mono text-slate-300">v{motor.version}</span>
      </div>

      {/* ── Mini-log ─────────────────────────────────────────────── */}
      <div className="mx-4 mb-3 bg-[#0D1117] rounded-xl border border-slate-800/80 overflow-hidden">
        <div className="px-3 py-1.5 border-b border-slate-800/60 flex items-center gap-1.5">
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500/60" />
            <span className="w-2 h-2 rounded-full bg-amber-500/60" />
            <span className="w-2 h-2 rounded-full bg-emerald-500/60" />
          </div>
          <span className="text-[9px] font-mono text-slate-600 ml-1">log — {motor.name.toLowerCase().replace(/\s+/g, "-")}</span>
        </div>
        <div className="p-3 space-y-1">
          {motor.logs.map((log, i) => (
            <p key={i} className="text-[11px] font-mono leading-relaxed flex gap-2">
              <span className="text-slate-600 shrink-0">[{log.time}]</span>
              <span className={LOG_COLOR(log.text)}>{log.text}</span>
            </p>
          ))}
        </div>
      </div>

      {/* ── Actions ──────────────────────────────────────────────── */}
      <div
        className="px-4 pb-4 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Config button */}
        <button
          onClick={() => onConfigure(motor)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border font-medium transition-all
            ${selected
              ? "text-blue-700 border-blue-300 bg-blue-100/70 hover:bg-blue-200/60"
              : "text-slate-600 border-slate-200 bg-white hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 shadow-sm"
            }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Configurar
        </button>

        {/* Toggle button */}
        <button
          onClick={() => onToggle(motor.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border font-medium transition-all shadow-sm
            ${motor.status === "active"
              ? "text-slate-500 border-slate-200 bg-white hover:text-red-600 hover:border-red-200 hover:bg-red-50"
              : "text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300"
            }`}
        >
          <Power className="w-3.5 h-3.5" />
          {motor.status === "active" ? "Desactivar" : "Activar"}
        </button>

        {/* Error badge */}
        {motor.status === "error" && (
          <span className="ml-auto flex items-center gap-1 text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-full border border-red-200 font-semibold">
            <AlertCircle className="w-3 h-3" />
            Requiere atención
          </span>
        )}

        {/* Version chip for non-error states */}
        {motor.status !== "error" && (
          <div className="ml-auto">
            {motor.status === "active" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <XCircle className="w-4 h-4 text-slate-300" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
