import { useState, useCallback, useEffect } from "react"
import { Building2 } from "lucide-react"
import { TopBar } from "./components/TopBar"
import { LeftPanel } from "./components/LeftPanel"
import { RightPanel } from "./components/RightPanel"
import { GlobalConfigModal } from "./components/GlobalConfigModal"
import { CredentialsModal } from "./components/CredentialsModal"
import { Toaster, useToast } from "./components/Toast"
import { DesignSystemPage } from "./design-system/DesignSystemPage"
import { supabase } from "./lib/supabase"
import type { Motor, Company, Signal, OrchestratorEvent } from "./data"

export default function App() {
  const [view, setView] = useState<"dashboard" | "design-system">("dashboard")

  const [motors, setMotors]           = useState<Motor[]>([])
  const [companies, setCompanies]     = useState<Company[]>([])
  const [signals, setSignals]         = useState<Signal[]>([])
  const [events, setEvents]           = useState<OrchestratorEvent[]>([])
  const [selectedMotorId, setSelectedMotorId]   = useState<string | null>(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("")
  const [showGlobalConfig, setShowGlobalConfig] = useState(false)
  const [showCredentials, setShowCredentials]   = useState(false)
  const [loading, setLoading] = useState(true)

  const { toasts, addToast, removeToast } = useToast()

  // ── Cargar datos desde Supabase ──────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      const [
        { data: motorsData },
        { data: companiesData },
        { data: signalsData },
        { data: eventsData },
      ] = await Promise.all([
        supabase.from("orquesta_motors").select("*").order("created_at", { ascending: false }),
        supabase.from("orquesta_companies").select("*").order("created_at", { ascending: false }),
        supabase.from("orquesta_signals").select("*").order("created_at", { ascending: false }),
        supabase.from("orquesta_events").select("*").order("created_at", { ascending: false }),
      ])

      const mappedMotors: Motor[] = (motorsData ?? []).map((m: any) => ({
        id:          m.id,
        name:        m.name,
        description: m.description ?? "",
        version:     m.version ?? "1.0.0",
        status:      m.status ?? "inactive",
        icon:        m.icon ?? "globe",
        lastRun:     m.last_run_at ? new Date(m.last_run_at).toLocaleString("es") : "nunca",
        logs:        Array.isArray(m.logs) ? m.logs : [],
        companies:   m.companies ?? [],
        interval:    m.interval_min ?? 30,
        sources:     m.sources ?? [],
        detailLevel: m.detail_level ?? "Estándar",
        fallback:    m.fallback ?? "",
        credentials: [],
      }))

      const mappedCompanies: Company[] = (companiesData ?? []).map((c: any) => ({
        id:        c.id,
        name:      c.name,
        industry:  c.industry ?? "",
        location:  c.location ?? "",
        size:      c.size ?? "",
        activity:  c.activity ?? "low",
        summary:   c.summary ?? "",
        verticals: Array.isArray(c.verticals) ? c.verticals : [],
      }))

      const mappedSignals: Signal[] = (signalsData ?? []).map((s: any) => ({
        id:          s.id,
        title:       s.title,
        description: s.description ?? "",
        source:      s.source ?? "",
        motor:       s.motor_id ?? "",
        motorIcon:   "rss",
        priority:    s.priority ?? "media",
        status:      s.status ?? "nueva",
        companyId:   s.company_id ?? "",
        time:        new Date(s.created_at).toLocaleString("es"),
      }))

      const mappedEvents: OrchestratorEvent[] = (eventsData ?? []).map((e: any) => ({
        id:          e.id,
        date:        new Date(e.created_at).toLocaleString("es"),
        motorId:     e.motor_id ?? "",
        motorName:   e.motor_id ?? "",
        motorIcon:   "rss",
        type:        e.type ?? "expansion",
        description: e.description,
        companyId:   e.company_id ?? "",
      }))

      setMotors(mappedMotors)
      setCompanies(mappedCompanies)
      setSignals(mappedSignals)
      setEvents(mappedEvents)
      if (mappedCompanies.length > 0) setSelectedCompanyId(mappedCompanies[0].id)
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel("orquesta-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orquesta_motors" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "orquesta_signals" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "orquesta_events" }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── Motor handlers ───────────────────────────────────────────────
  const handleSelectMotor = useCallback((id: string) => {
    setSelectedMotorId((prev) => (prev === id ? null : id))
  }, [])

  const handleToggleMotor = useCallback(async (id: string) => {
    const motor = motors.find((m) => m.id === id)
    if (!motor) return
    const newStatus = motor.status === "active" ? "inactive" : "active"
    await supabase
      .from("orquesta_motors")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id)
    setMotors((prev) => prev.map((m) => m.id === id ? { ...m, status: newStatus } : m))
  }, [motors])

  const handleSaveMotorConfig = useCallback(async (id: string, updates: Partial<Motor>) => {
    await supabase.from("orquesta_motors").update({
      name:         updates.name,
      description:  updates.description,
      interval_min: updates.interval,
      sources:      updates.sources,
      detail_level: updates.detailLevel,
      fallback:     updates.fallback,
      updated_at:   new Date().toISOString(),
    }).eq("id", id)
    setMotors((prev) => prev.map((m) => m.id === id ? { ...m, ...updates } : m))
  }, [])

  const handleInstallMotor = useCallback(async (motor: Partial<Motor>) => {
    const { data } = await supabase.from("orquesta_motors").insert({
      name:         motor.name ?? "Nuevo motor",
      description:  motor.description ?? "",
      version:      motor.version ?? "1.0.0",
      status:       "inactive",
      icon:         motor.icon ?? "globe",
      interval_min: 30,
      sources:      [],
      detail_level: "Estándar",
      companies:    [],
      logs:         [],
    }).select().single()

    if (data) {
      setMotors((prev) => [...prev, {
        id:          data.id,
        name:        data.name,
        description: data.description ?? "",
        version:     data.version ?? "1.0.0",
        status:      "inactive",
        icon:        data.icon ?? "globe",
        lastRun:     "nunca",
        logs:        [],
        companies:   [],
        interval:    30,
        sources:     [],
        detailLevel: "Estándar",
        fallback:    "",
        credentials: [],
      }])
    }
  }, [])

  const activeMotors = motors.filter((m) => m.status === "active").length
  const errorMotors  = motors.filter((m) => m.status === "error").length

  // ── Views ────────────────────────────────────────────────────────
  if (view === "design-system") {
    return <DesignSystemPage onBack={() => setView("dashboard")} />
  }

  if (loading) {
    return (
      <div style={{
        display: "flex", height: "100vh",
        alignItems: "center", justifyContent: "center",
        background: "#0B1120", color: "#475569", fontSize: 13,
        fontFamily: "Inter, sans-serif",
      }}>
        Cargando Orquestador…
      </div>
    )
  }

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif", background: "#0B1120" }}
    >
      <Toaster toasts={toasts} onRemove={removeToast} />

      <TopBar
        activeMotors={activeMotors}
        totalMotors={motors.length}
        errorMotors={errorMotors}
        onOpenGlobalConfig={() => setShowGlobalConfig(true)}
        onOpenCredentials={() => setShowCredentials(true)}
        onOpenDesignSystem={() => setView("design-system")}
      />

      <div className="flex flex-1 overflow-hidden p-3 gap-3 min-h-0">

        {/* Panel izquierdo — Motores */}
        <div
          className="shrink-0 overflow-hidden flex flex-col rounded-2xl border border-white/[0.06] shadow-2xl shadow-black/30"
          style={{ width: 390 }}
        >
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

        {/* Panel derecho — Generador de contexto */}
        <div className="flex-1 overflow-hidden flex flex-col min-w-0 rounded-2xl border border-white/[0.06] shadow-2xl shadow-black/30">
          {companies.length > 0 ? (
            <RightPanel
              companies={companies}
              selectedCompanyId={selectedCompanyId}
              onSelectCompany={setSelectedCompanyId}
              signals={signals}
              events={events}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-14 h-14 bg-white/[0.04] border border-white/[0.08] rounded-2xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-slate-600" />
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-sm font-medium">No hay empresas cargadas</p>
                <p className="text-slate-600 text-xs mt-1">
                  Agregá una empresa en Supabase para comenzar
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      <footer className="shrink-0 px-5 py-2 flex items-center justify-between">
        <p className="text-[10px] text-slate-700 font-mono">
          orquestador.core.com.uy
          <span className="text-slate-800 mx-2">—</span>
          Módulo de Charlie
          <span className="text-slate-800 mx-2">·</span>
          v0.1.0
        </p>
        <p className="text-[10px] text-slate-700 font-mono">
          {new Date().toLocaleDateString("es-UY", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
          <span className="mx-1.5 text-slate-800">·</span>
          {new Date().toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </footer>

      {showGlobalConfig && <GlobalConfigModal onClose={() => setShowGlobalConfig(false)} />}
      {showCredentials  && <CredentialsModal  onClose={() => setShowCredentials(false)}  />}
    </div>
  )
}
