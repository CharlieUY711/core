import { useState, useCallback } from "react";
import { Plus, Plug, Search, SlidersHorizontal } from "lucide-react";
import { MotorCard } from "./MotorCard";
import { ConfigModal } from "./ConfigModal";
import { MotorDetailPanel } from "./MotorDetailPanel";
import { AddMotorModal } from "./AddMotorModal";
import type { Motor, MotorStatus } from "../data";
import type { ToastItem } from "./Toast";

interface LeftPanelProps {
  motors: Motor[];
  selectedMotorId: string | null;
  onSelectMotor: (id: string) => void;
  onToggleMotor: (id: string) => void;
  onSaveMotorConfig: (id: string, updates: Partial<Motor>) => void;
  onInstallMotor: (motor: Partial<Motor>) => void;
  onOpenCredentials: () => void;
  onToast: (t: Omit<ToastItem, "id">) => void;
}

export function LeftPanel({
  motors, selectedMotorId, onSelectMotor, onToggleMotor,
  onSaveMotorConfig, onInstallMotor, onOpenCredentials, onToast,
}: LeftPanelProps) {
  const [configuringMotor, setConfiguringMotor] = useState<Motor | null>(null);
  const [statusFilter, setStatusFilter] = useState<MotorStatus | "all">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");
  const [toggleTooltip, setToggleTooltip] = useState<{ id: string; msg: string } | null>(null);

  const activeCount   = motors.filter((m) => m.status === "active").length;
  const errorCount    = motors.filter((m) => m.status === "error").length;
  const inactiveCount = motors.filter((m) => m.status === "inactive").length;
  const selectedMotor = motors.find((m) => m.id === selectedMotorId) ?? null;

  const filtered = motors
    .filter((m) => statusFilter === "all" || m.status === statusFilter)
    .filter((m) => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.description.toLowerCase().includes(search.toLowerCase()));

  const handleToggle = useCallback((id: string) => {
    const motor = motors.find((m) => m.id === id);
    if (!motor) return;
    onToggleMotor(id);
    const isNowActive = motor.status !== "active";
    const msg = isNowActive ? "Motor activado" : "Motor desactivado";
    onToast({ type: isNowActive ? "success" : "info", title: msg, description: `${motor.name} — estado actualizado.`, duration: 3000 });
    setToggleTooltip({ id, msg });
    setTimeout(() => setToggleTooltip(null), 2500);
  }, [motors, onToggleMotor, onToast]);

  const handleInstall = useCallback((motor: Partial<Motor>) => {
    onInstallMotor(motor);
    onToast({ type: "success", title: "Motor instalado", description: `"${motor.name}" añadido al panel.`, duration: 6000 });
  }, [onInstallMotor, onToast]);

  const FILTERS: { key: MotorStatus | "all"; label: string; count: number; dot: string }[] = [
    { key: "all",      label: "Todos",     count: motors.length, dot: "bg-slate-400" },
    { key: "active",   label: "Activos",   count: activeCount,   dot: "bg-emerald-500" },
    { key: "error",    label: "Errores",   count: errorCount,    dot: "bg-red-500" },
    { key: "inactive", label: "Inactivos", count: inactiveCount, dot: "bg-slate-400" },
  ];

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden bg-[#F7F8FA]">

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="bg-[#0B1120] border-b border-white/[0.06] shrink-0">
          {/* Title row */}
          <div className="px-4 pt-4 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center">
                <Plug className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold text-sm leading-none">Motores Enchufables</h2>
                <p className="text-slate-500 text-[10px] mt-0.5">
                  <span className="text-emerald-400 font-semibold">{activeCount}</span> activos · {motors.length} total
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm shadow-blue-600/30"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar
            </button>
          </div>

          {/* Search */}
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar motor…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-2 bg-white/[0.06] border border-white/[0.08] rounded-xl text-[11px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
              />
            </div>
          </div>

          {/* Status filters */}
          <div className="px-4 pb-3 flex items-center gap-1.5 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border font-medium transition-all
                  ${statusFilter === f.key
                    ? "bg-white/10 text-white border-white/20"
                    : "text-slate-500 border-white/[0.06] hover:text-slate-300 hover:border-white/10"
                  }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />
                {f.label}
                <span className={`text-[9px] font-mono ${statusFilter === f.key ? "text-slate-300" : "text-slate-600"}`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Motor list ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3 min-h-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-3 border border-slate-200">
                <Plug className="w-5 h-5 text-slate-300" />
              </div>
              <p className="text-sm text-slate-500 font-medium">Sin motores</p>
              <p className="text-xs text-slate-400 mt-1">
                {search ? `Sin resultados para "${search}"` : "No hay motores en este estado"}
              </p>
            </div>
          ) : (
            filtered.map((motor) => (
              <div key={motor.id} className="relative">
                {toggleTooltip?.id === motor.id && (
                  <div className="absolute top-2 right-2 z-30 bg-slate-900 text-white text-[11px] px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none anim-fade-in whitespace-nowrap border border-white/10">
                    {toggleTooltip.msg}
                  </div>
                )}
                <MotorCard
                  motor={motor}
                  selected={selectedMotorId === motor.id}
                  onSelect={onSelectMotor}
                  onConfigure={(m) => setConfiguringMotor(m)}
                  onToggle={handleToggle}
                />
              </div>
            ))
          )}
        </div>

        {/* ── Motor Detail Slide-up ──────────────────────────────── */}
        <MotorDetailPanel
          motor={selectedMotor}
          visible={!!selectedMotorId}
          onClose={() => onSelectMotor(selectedMotorId!)}
          onConfigure={(m) => setConfiguringMotor(m)}
          onToggle={handleToggle}
        />

        {/* ── Footer ────────────────────────────────────────────── */}
        <div className="shrink-0 p-3.5 border-t border-slate-200 bg-white">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs text-blue-600 font-medium border-2 border-dashed border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar nuevo motor al panel
          </button>
        </div>
      </div>

      {/* ── Config Modal ────────────────────────────────────────── */}
      {configuringMotor && (
        <ConfigModal
          motor={configuringMotor}
          onClose={() => setConfiguringMotor(null)}
          onSave={(id, updates) => { onSaveMotorConfig(id, updates); setConfiguringMotor(null); }}
          onOpenCredentials={onOpenCredentials}
          onToast={onToast}
        />
      )}

      {/* ── Add Motor Modal ──────────────────────────────────────── */}
      {showAddModal && (
        <AddMotorModal
          onClose={() => setShowAddModal(false)}
          onInstall={handleInstall}
        />
      )}
    </>
  );
}
