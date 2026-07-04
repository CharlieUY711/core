import { useState, useEffect } from "react";
import {
  X, Settings, Power, Clock, CheckCircle2, XCircle, AlertCircle,
  Rss, Globe, Database, Mail, TrendingUp, Search, Terminal,
  ChevronRight, Activity,
} from "lucide-react";
import type { Motor, MotorStatus } from "../data";

const ICONS: Record<string, React.ElementType> = {
  rss: Rss, globe: Globe, database: Database,
  mail: Mail, trending: TrendingUp, search: Search,
};

const STATUS: Record<MotorStatus, { label: string; dot: string; text: string; bg: string; icon: React.ElementType }> = {
  active:   { label: "Activo",   dot: "bg-emerald-500 animate-pulse", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  inactive: { label: "Inactivo", dot: "bg-slate-400",                  text: "text-slate-500",   bg: "bg-slate-100 border-slate-200",   icon: XCircle },
  error:    { label: "Error",    dot: "bg-red-500 animate-pulse",      text: "text-red-700",     bg: "bg-red-50 border-red-200",        icon: AlertCircle },
};

interface MotorDetailPanelProps {
  motor: Motor | null;
  visible: boolean;
  onClose: () => void;
  onConfigure: (motor: Motor) => void;
  onToggle: (id: string) => void;
}

export function MotorDetailPanel({ motor, visible, onClose, onConfigure, onToggle }: MotorDetailPanelProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible && motor) {
      const t = setTimeout(() => setMounted(true), 10);
      return () => clearTimeout(t);
    } else {
      setMounted(false);
    }
  }, [visible, motor]);

  if (!motor) return null;

  const cfg = STATUS[motor.status];
  const StatusIcon = cfg.icon;
  const MotorIcon = ICONS[motor.icon] || Globe;

  return (
    <div
      className="shrink-0 overflow-hidden border-t border-slate-200 bg-white"
      style={{
        maxHeight: mounted && visible ? 300 : 0,
        opacity: mounted && visible ? 1 : 0,
        transition: "max-height 0.35s cubic-bezier(0.34,1.05,0.64,1), opacity 0.25s ease-out",
      }}
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${cfg.bg}`}>
            <MotorIcon className={`w-4 h-4 ${cfg.text}`} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Motor seleccionado</p>
            <h4 className="text-slate-800 font-bold text-xs mt-0.5">{motor.name}</h4>
          </div>
        </div>
        <button onClick={onClose}
          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Metadata row */}
      <div className="px-4 pb-2 flex items-center gap-3">
        <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-slate-400">
          <Clock className="w-3 h-3" />
          {motor.lastRun}
        </span>
        <span className="text-[11px] text-slate-400 ml-auto font-mono">v{motor.version}</span>
      </div>

      {/* Companies */}
      {motor.companies.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {motor.companies.map((c) => (
            <span key={c} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Mini log */}
      <div className="mx-4 mb-3 bg-[#0D1117] rounded-lg p-2.5 border border-slate-800 max-h-[68px] overflow-y-auto">
        {motor.logs.map((log, i) => (
          <p key={i} className="text-[10px] font-mono leading-relaxed">
            <span className="text-slate-600">[{log.time}]</span>{" "}
            <span className={
              log.text.startsWith("✓") ? "text-emerald-400" :
              log.text.startsWith("✗") ? "text-red-400" :
              log.text.startsWith("⚠") ? "text-amber-400" :
              log.text.startsWith("↻") ? "text-blue-400" : "text-slate-400"
            }>{log.text}</span>
          </p>
        ))}
      </div>

      {/* Actions */}
      <div className="px-4 pb-3 flex items-center gap-2">
        <button onClick={() => onConfigure(motor)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors shadow-sm font-semibold">
          <Settings className="w-3.5 h-3.5" />
          Configurar motor
        </button>
        <button onClick={() => onToggle(motor.id)}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-xl border transition-colors font-semibold
            ${motor.status === "active"
              ? "border-red-200 text-red-600 hover:bg-red-50"
              : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
            }`}>
          <Power className="w-3.5 h-3.5" />
          {motor.status === "active" ? "Desactivar" : "Activar"}
        </button>
        <button onClick={() => {}} title="Actividad"
          className="w-8 h-8 flex items-center justify-center text-slate-400 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
          <Activity className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
