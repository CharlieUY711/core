import { useState, useCallback } from "react";
import { TopBar } from "./components/TopBar";
import { LeftPanel } from "./components/LeftPanel";
import { RightPanel } from "./components/RightPanel";
import { GlobalConfigModal } from "./components/GlobalConfigModal";
import { CredentialsModal } from "./components/CredentialsModal";
import { Toaster, useToast } from "./components/Toast";
import { DesignSystemPage } from "./design-system/DesignSystemPage";
import { MOTORS, COMPANIES, SIGNALS, EVENTS } from "./data";
import type { Motor } from "./data";

export default function App() {
  // ── View ─────────────────────────────────────────────────────────
  const [view, setView] = useState<"dashboard" | "design-system">("dashboard");

  // ── Motor state ──────────────────────────────────────────────────
  const [motors, setMotors] = useState<Motor[]>(MOTORS);
  const [selectedMotorId, setSelectedMotorId] = useState<string | null>(null);

  // ── Company state ────────────────────────────────────────────────
  const [selectedCompanyId, setSelectedCompanyId] = useState(COMPANIES[0].id);

  // ── Modals ───────────────────────────────────────────────────────
  const [showGlobalConfig, setShowGlobalConfig] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  // ── Toast system ─────────────────────────────────────────────────
  const { toasts, addToast, removeToast } = useToast();

  // ── Motor handlers ────────────────────────────────────────────────
  const handleSelectMotor = useCallback((id: string) => {
    setSelectedMotorId((prev) => (prev === id ? null : id));
  }, []);

  const handleToggleMotor = useCallback((id: string) => {
    setMotors((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              status: m.status === "active" ? "inactive" : "active",
              logs: m.status === "active"
                ? [{ time: new Date().toTimeString().slice(0, 5), text: "— Motor desactivado manualmente" }, ...m.logs.slice(0, 2)]
                : [{ time: new Date().toTimeString().slice(0, 5), text: "✓ Motor activado exitosamente" }, ...m.logs.slice(0, 2)],
            }
          : m
      )
    );
  }, []);

  const handleSaveMotorConfig = useCallback((id: string, updates: Partial<Motor>) => {
    setMotors((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  }, []);

  const handleInstallMotor = useCallback((motor: Partial<Motor>) => {
    const newMotor: Motor = {
      id: motor.id ?? `m-${Date.now()}`,
      name: motor.name ?? "Nuevo motor",
      description: motor.description ?? "",
      version: motor.version ?? "1.0.0",
      status: "inactive",
      icon: motor.icon ?? "globe",
      lastRun: "nunca",
      logs: motor.logs ?? [{ time: "—", text: "— Motor instalado, pendiente de activación" }],
      companies: [],
      interval: 30,
      sources: [],
      detailLevel: "Estándar",
      fallback: "Si falla la fuente → reintentar",
      credentials: motor.credentials ?? [],
    };
    setMotors((prev) => [...prev, newMotor]);
  }, []);

  // ── Derived ───────────────────────────────────────────────────────
  const activeMotors = motors.filter((m) => m.status === "active").length;
  const errorMotors  = motors.filter((m) => m.status === "error").length;

  // ── Design System view ────────────────────────────────────────────
  if (view === "design-system") {
    return <DesignSystemPage onBack={() => setView("dashboard")} />;
  }

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif", background: "#0B1120" }}
    >
      {/* ── Toast notifications ─────────────────────────────────── */}
      <Toaster toasts={toasts} onRemove={removeToast} />

      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <TopBar
        activeMotors={activeMotors}
        totalMotors={motors.length}
        errorMotors={errorMotors}
        onOpenGlobalConfig={() => setShowGlobalConfig(true)}
        onOpenCredentials={() => setShowCredentials(true)}
        onOpenDesignSystem={() => setView("design-system")}
      />

      {/* ── Main layout ─────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden p-3 gap-3 min-h-0">

        {/* Left column — Motores */}
        <div className="shrink-0 overflow-hidden flex flex-col rounded-2xl border border-white/[0.06] shadow-2xl shadow-black/30" style={{ width: 390 }}>
          <LeftPanel
            motors={motors}
            selectedMotorId={selectedMotorId}
            onSelectMotor={handleSelectMotor}
            onToggleMotor={handleToggleMotor}
            onSaveMotorConfig={handleSaveMotorConfig}
            onInstallMotor={handleInstallMotor}
            onOpenCredentials={() => setShowCredentials(true)}
            onToast={addToast}
          />
        </div>

        {/* Right column — Context Generator */}
        <div className="flex-1 overflow-hidden flex flex-col min-w-0 rounded-2xl border border-white/[0.06] shadow-2xl shadow-black/30">
          <RightPanel
            companies={COMPANIES}
            selectedCompanyId={selectedCompanyId}
            onSelectCompany={setSelectedCompanyId}
            signals={SIGNALS}
            events={EVENTS}
          />
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="shrink-0 px-5 py-2 flex items-center justify-between">
        <p className="text-[10px] text-slate-700 font-mono">
          orquestador.core.com.uy
          <span className="text-slate-800 mx-2">—</span>
          Módulo de Charlie
          <span className="text-slate-800 mx-2">·</span>
          v2.4.1
        </p>
        <p className="text-[10px] text-slate-700 font-mono">
          {new Date().toLocaleDateString("es-UY", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
          <span className="mx-1.5 text-slate-800">·</span>
          {new Date().toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </footer>

      {/* ── Modals ──────────────────────────────────────────────── */}
      {showGlobalConfig && <GlobalConfigModal onClose={() => setShowGlobalConfig(false)} />}
      {showCredentials  && <CredentialsModal  onClose={() => setShowCredentials(false)}  />}
    </div>
  );
}
