import { Activity, Settings, KeyRound, Layers, Bell, AlertTriangle } from "lucide-react";

interface TopBarProps {
  onOpenCredentials: () => void;
  onOpenGlobalConfig: () => void;
  onOpenDesignSystem: () => void;
  activeMotors: number;
  totalMotors: number;
  errorMotors: number;
}

export function TopBar({
  onOpenCredentials, onOpenGlobalConfig, onOpenDesignSystem,
  activeMotors, totalMotors, errorMotors,
}: TopBarProps) {
  return (
    <header className="h-[52px] bg-[#0B1120] border-b border-white/[0.06] flex items-center justify-between px-5 shrink-0 z-50">

      {/* ── Logo ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/30">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="3" fill="white" />
              <path d="M10 2L10 6M10 14L10 18M2 10L6 10M14 10L18 10" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          {activeMotors > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-[#0B1120]" />
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-white font-bold text-sm tracking-tight">Orquestador</span>
          <span className="text-[10px] text-slate-500 font-mono bg-white/[0.06] px-1.5 py-0.5 rounded-md border border-white/[0.06]">
            v2.4.1
          </span>
        </div>
        <div className="w-px h-4 bg-white/10 mx-1" />
        <span className="text-slate-500 text-[11px]">Módulo de Charlie</span>
      </div>

      {/* ── Status ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.06] rounded-full px-4 py-1.5">
          {/* Live indicator */}
          <div className="relative flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 block" />
            <span className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-40" />
          </div>
          <span className="text-slate-300 text-xs font-medium">Sistema operativo</span>
          <div className="w-px h-3 bg-white/10" />
          <Activity className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-400 text-xs">
            <span className="text-emerald-400 font-bold">{activeMotors}</span>
            <span className="text-slate-600">/{totalMotors}</span>
            <span className="ml-1">activos</span>
          </span>
          {errorMotors > 0 && (
            <>
              <div className="w-px h-3 bg-white/10" />
              <span className="flex items-center gap-1 text-red-400 text-xs font-semibold">
                <AlertTriangle className="w-3 h-3" />
                {errorMotors} error{errorMotors !== 1 ? "es" : ""}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Actions ───────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-all border border-transparent hover:border-white/10">
          <Bell className="w-3.5 h-3.5" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full" />
        </button>

        <div className="w-px h-4 bg-white/[0.08] mx-0.5" />

        {/* Design System */}
        <button onClick={onOpenDesignSystem}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-500 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-all text-[11px] border border-transparent hover:border-white/10">
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:block">DS</span>
        </button>

        {/* Credentials */}
        <button onClick={onOpenCredentials}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-all text-xs border border-transparent hover:border-white/10">
          <KeyRound className="w-3.5 h-3.5" />
          Credenciales
        </button>

        {/* Global config */}
        <button onClick={onOpenGlobalConfig}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/90 hover:bg-blue-500 text-white rounded-xl transition-all text-xs shadow-sm shadow-blue-600/20 font-semibold ml-0.5">
          <Settings className="w-3.5 h-3.5" />
          Config. global
        </button>
      </div>
    </header>
  );
}
