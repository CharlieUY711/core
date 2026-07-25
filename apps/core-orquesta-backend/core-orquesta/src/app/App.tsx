import { useCallback, useEffect, useMemo, useState } from "react";
import { TopBar } from "../components/TopBar";
import { LeftPanel } from "../components/LeftPanel";
import { RightPanel } from "../components/RightPanel";
import { GlobalConfigModal } from "../components/GlobalConfigModal";
import { CredentialsModal } from "../components/CredentialsModal";
import { Toaster, useToast } from "../components/Toast";
import { DesignSystemPage } from "../design-system/DesignSystemPage";
import type { Motor } from "../data";

import { useAuth } from "../hooks/useAuth";
import { useMotors } from "../hooks/useMotors";
import { useCompanies } from "../hooks/useCompanies";
import { useSignals } from "../hooks/useSignals";
import { useEvents } from "../hooks/useEvents";

export default function App() {
  // ── View ─────────────────────────────────────────────────────────
  const [view, setView] = useState<"dashboard" | "design-system">("dashboard");

  // ── Session ──────────────────────────────────────────────────────
  const { user, signOut } = useAuth();

  // ── Toast system ─────────────────────────────────────────────────
  const { toasts, addToast, removeToast } = useToast();

  // ── Data: motors ─────────────────────────────────────────────────
  const {
    motors,
    loading: motorsLoading,
    error: motorsError,
    toggleMotor,
    saveMotorConfig,
    installMotor,
  } = useMotors();

  // Lookup usado para enriquecer señales/eventos con nombre + icono del motor
  const motorNamesById = useMemo(() => {
    const map: Record<string, { name: string; icon: string }> = {};
    for (const m of motors) map[m.id] = { name: m.name, icon: m.icon };
    return map;
  }, [motors]);

  // ── Data: companies ──────────────────────────────────────────────
  const {
    companies,
    loading: companiesLoading,
    error: companiesError,
  } = useCompanies();

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Selecciona la primera empresa apenas llegan datos (o si la seleccionada
  // deja de existir, p. ej. fue borrada).
  useEffect(() => {
    if (companies.length === 0) return;
    if (!selectedCompanyId || !companies.some((c) => c.id === selectedCompanyId)) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);

  // ── Data: signals & events (filtrados por empresa seleccionada) ───
  const { signals } = useSignals({
    companyId: selectedCompanyId ?? undefined,
    motorNamesById,
  });
  const { events } = useEvents({
    companyId: selectedCompanyId ?? undefined,
    motorNamesById,
  });

  // ── Selected motor (panel izquierdo) ────────────────────────────
  const [selectedMotorId, setSelectedMotorId] = useState<string | null>(null);

  // ── Modals ───────────────────────────────────────────────────────
  const [showGlobalConfig, setShowGlobalConfig] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  // ── Errores de backend → toast, sin bloquear la UI ──────────────
  useEffect(() => {
    if (motorsError) {
      addToast({ type: "error", title: "No se pudieron cargar los motores", description: motorsError });
    }
  }, [motorsError, addToast]);

  useEffect(() => {
    if (companiesError) {
      addToast({ type: "error", title: "No se pudieron cargar las empresas", description: companiesError });
    }
  }, [companiesError, addToast]);

  // ── Motor handlers ───────────────────────────────────────────────
  const handleSelectMotor = useCallback((id: string) => {
    setSelectedMotorId((prev) => (prev === id ? null : id));
  }, []);

  const handleToggleMotor = useCallback(
    async (id: string) => {
      const motor = motors.find((m) => m.id === id);
      await toggleMotor(id);
      addToast({
        type: "success",
        title: motor?.status === "active" ? "Motor desactivado" : "Motor activado",
        description: motor?.name,
      });
    },
    [motors, toggleMotor, addToast]
  );

  const handleSaveMotorConfig = useCallback(
    async (id: string, updates: Partial<Motor>) => {
      await saveMotorConfig(id, updates);
      addToast({ type: "success", title: "Configuración guardada" });
    },
    [saveMotorConfig, addToast]
  );

  const handleInstallMotor = useCallback(
    async (motor: Partial<Motor>) => {
      await installMotor(motor);
      addToast({ type: "success", title: "Motor instalado", description: motor.name });
    },
    [installMotor, addToast]
  );

  // ── Derived ───────────────────────────────────────────────────────
  const activeMotors = motors.filter((m) => m.status === "active").length;
  const errorMotors = motors.filter((m) => m.status === "error").length;

  // ── Design System view ────────────────────────────────────────────
  if (view === "design-system") {
    return <DesignSystemPage onBack={() => setView("dashboard")} />;
  }

  // ── Loading inicial (primera carga de motores/empresas) ───────────
  const initialLoading = (motorsLoading && motors.length === 0) || (companiesLoading && companies.length === 0);

  if (initialLoading) {
    return (
      <div
        className="flex h-screen w-screen items-center justify-center"
        style={{ background: "#0B1120" }}
      >
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm">Cargando orquestador…</span>
        </div>
      </div>
    );
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
        userEmail={user?.email}
        onSignOut={signOut}
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
          {companies.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-slate-500 text-sm bg-white px-8 text-center">
              Todavía no hay empresas cargadas en Supabase (tabla orquesta_companies).
            </div>
          ) : (
            <RightPanel
              companies={companies}
              selectedCompanyId={selectedCompanyId ?? companies[0].id}
              onSelectCompany={setSelectedCompanyId}
              signals={signals}
              events={events}
            />
          )}
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
