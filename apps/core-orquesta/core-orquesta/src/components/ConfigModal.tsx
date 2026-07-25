import { useState } from "react";
import {
  X, CheckCircle2, AlertCircle, Plus, Save, KeyRound,
  Info, Settings2, ShieldCheck, Lightbulb, Globe,
  Loader2, AlertTriangle,
} from "lucide-react";
import type { Motor } from "../data";
import { MOTOR_ICONS } from "./MotorCard";
import type { ToastItem } from "./Toast";

interface ConfigModalProps {
  motor: Motor;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Motor>) => void;
  onOpenCredentials: () => void;
  onToast: (t: Omit<ToastItem, "id">) => void;
}

const ALL_SOURCES = [
  { id: "rss", label: "RSS Feeds" },
  { id: "web", label: "Scraping Web" },
  { id: "api", label: "APIs externas" },
  { id: "db", label: "Base de datos interna" },
  { id: "email", label: "Alertas Email" },
];

const DETAIL_LEVELS = ["Básico", "Estándar", "Detallado", "Verbose"];

const FALLBACK_OPTIONS = [
  "Si falla la fuente → reintentar",
  "Si no hay datos nuevos → esperar",
  "Si hay error de credenciales → notificar",
  "Si hay demasiados eventos → limitar",
];

type Section = "info" | "config" | "credentials" | "fallback";
type SaveState = "idle" | "saving" | "success" | "error";

export function ConfigModal({ motor, onClose, onSave, onOpenCredentials, onToast }: ConfigModalProps) {
  const [activeSection, setActiveSection] = useState<Section>("info");
  const [interval, setInterval] = useState(motor.interval);
  const [companies, setCompanies] = useState<string[]>(motor.companies);
  const [newCompany, setNewCompany] = useState("");
  const [sources, setSources] = useState<string[]>(motor.sources);
  const [detailLevel, setDetailLevel] = useState(motor.detailLevel);
  const [fallback, setFallback] = useState(motor.fallback);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const MotorIcon = MOTOR_ICONS[motor.icon] || Globe;
  const missingCreds = motor.credentials.filter((c) => !c.loaded);
  const hasMissingCreds = missingCreds.length > 0;

  const handleAddCompany = () => {
    const t = newCompany.trim();
    if (t && !companies.includes(t)) {
      setCompanies([...companies, t]);
      setNewCompany("");
    }
  };

  const toggleSource = (id: string) =>
    setSources((p) => p.includes(id) ? p.filter((s) => s !== id) : [...p, id]);

  const handleSave = () => {
    if (saveState === "saving") return;

    // Validate
    if (sources.length === 0) {
      setSaveError("Debes seleccionar al menos una fuente de datos.");
      setSaveState("error");
      setTimeout(() => { setSaveState("idle"); setSaveError(null); }, 3500);
      return;
    }

    setSaveState("saving");
    setSaveError(null);

    // Simulate async save
    setTimeout(() => {
      if (hasMissingCreds) {
        // Soft warning but still saves
        onSave(motor.id, {
          interval, companies, sources, detailLevel, fallback,
          lastRun: "justo ahora",
        });
        setSaveState("success");
        onToast({
          type: "warning",
          title: "Configuración guardada con advertencias",
          description: `${missingCreds.length} credencial(es) faltante(s). El motor puede no funcionar correctamente.`,
          duration: 6000,
        });
        setTimeout(onClose, 1200);
      } else {
        onSave(motor.id, {
          interval, companies, sources, detailLevel, fallback,
          lastRun: "justo ahora",
        });
        setSaveState("success");
        onToast({
          type: "success",
          title: "Configuración actualizada",
          description: `Motor "${motor.name}" configurado exitosamente.`,
        });
        setTimeout(onClose, 900);
      }
    }, 1600);
  };

  const sections: { id: Section; label: string; icon: React.ElementType; hasError?: boolean }[] = [
    { id: "info", label: "Información", icon: Info },
    { id: "config", label: "Configuración", icon: Settings2 },
    { id: "credentials", label: "Credenciales", icon: ShieldCheck, hasError: hasMissingCreds },
    { id: "fallback", label: "Previsiones", icon: Lightbulb },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative ml-auto w-full max-w-[520px] bg-white h-full shadow-2xl flex flex-col anim-slide-in-right">

        {/* ── Header ── */}
        <div className="bg-[#0B1120] px-5 py-4 flex items-center justify-between shrink-0 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center">
              <MotorIcon className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Configuración del Motor</p>
              <h3 className="text-white font-semibold text-sm mt-0.5">{motor.name}</h3>
            </div>
          </div>

          {/* Save state indicator */}
          <div className="flex items-center gap-2">
            {saveState === "saving" && (
              <span className="flex items-center gap-1.5 text-[11px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
                <Loader2 className="w-3 h-3 animate-spin" />
                Guardando…
              </span>
            )}
            {saveState === "success" && (
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full anim-fade-in">
                <CheckCircle2 className="w-3 h-3" />
                ¡Guardado!
              </span>
            )}
            {saveState === "error" && (
              <span className="flex items-center gap-1.5 text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
                <AlertCircle className="w-3 h-3" />
                Error
              </span>
            )}
            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Section Nav ── */}
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0 px-1 pt-1">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = activeSection === s.id;
            return (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all rounded-t-lg mr-0.5
                  ${isActive
                    ? "bg-white text-blue-700 border-t border-x border-slate-200 -mb-px z-10"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  }`}>
                <Icon className="w-3.5 h-3.5" />
                {s.label}
                {s.hasError && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 absolute top-1.5 right-1" />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Error banner ── */}
        {saveState === "error" && saveError && (
          <div className="px-4 py-2.5 bg-red-50 border-b border-red-200 flex items-center gap-2.5 shrink-0 anim-fade-in">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-700">{saveError}</p>
          </div>
        )}

        {/* ── Credential warning banner ── */}
        {hasMissingCreds && activeSection !== "credentials" && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <p className="text-[11px] text-amber-700">
              {missingCreds.length} credencial(es) faltante(s).{" "}
              <button onClick={() => setActiveSection("credentials")}
                className="underline hover:text-amber-900 font-semibold">Ver credenciales</button>
            </p>
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Información general */}
          {activeSection === "info" && (
            <div className="p-5 space-y-4 anim-fade-in">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/30">
                  <MotorIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-slate-800 font-semibold">{motor.name}</h4>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{motor.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InfoField label="Versión" value={motor.version} mono />
                <InfoField label="Estado actual" value={motor.status === "active" ? "Activo" : motor.status === "error" ? "Error" : "Inactivo"} />
                <InfoField label="Última ejecución" value={motor.lastRun} />
                <InfoField label="Intervalo actual" value={`${motor.interval} min`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Empresas monitoreadas</p>
                <div className="flex flex-wrap gap-1.5">
                  {motor.companies.length > 0
                    ? motor.companies.map((c) => (
                        <span key={c} className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">{c}</span>
                      ))
                    : <span className="text-xs text-slate-400 italic">Sin empresas asignadas</span>
                  }
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Mini-log</p>
                <div className="bg-[#0D1117] rounded-lg p-3 space-y-1.5 border border-slate-800">
                  {motor.logs.map((log, i) => (
                    <p key={i} className="text-[11px] font-mono">
                      <span className="text-slate-600">[{log.time}]</span>{" "}
                      <span className={log.text.startsWith("✓") ? "text-emerald-400" : log.text.startsWith("✗") ? "text-red-400" : log.text.startsWith("⚠") ? "text-amber-400" : "text-slate-400"}>
                        {log.text}
                      </span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Configuración básica */}
          {activeSection === "config" && (
            <div className="p-5 space-y-5 anim-fade-in">
              <FormField label="Intervalo de ejecución (minutos)">
                <div className="flex items-center gap-3">
                  <input type="number" min={1} max={1440} value={interval}
                    onChange={(e) => setInterval(Number(e.target.value))}
                    className="w-28 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  <div className="flex gap-1.5">
                    {[5, 15, 30, 60].map((v) => (
                      <button key={v} onClick={() => setInterval(v)}
                        className={`px-2.5 py-1.5 text-xs rounded-lg border transition-all
                          ${interval === v ? "bg-blue-600 text-white border-blue-600" : "text-slate-500 border-slate-200 hover:bg-slate-50"}`}>
                        {v}m
                      </button>
                    ))}
                  </div>
                </div>
              </FormField>

              <FormField label="Empresas a monitorear">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 min-h-[42px] flex flex-wrap gap-1.5 mb-2">
                  {companies.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full border border-blue-200">
                      {c}
                      <button onClick={() => setCompanies(companies.filter((x) => x !== c))} className="hover:text-blue-900 ml-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {companies.length === 0 && <span className="text-xs text-slate-400 italic self-center">Sin empresas asignadas</span>}
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Agregar empresa…" value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCompany()}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  <button onClick={handleAddCompany}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </FormField>

              <FormField label="Fuentes habilitadas">
                <div className="space-y-1.5">
                  {ALL_SOURCES.map((src) => (
                    <label key={src.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all
                        ${sources.includes(src.id) ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
                      <input type="checkbox" checked={sources.includes(src.id)}
                        onChange={() => toggleSource(src.id)}
                        className="w-4 h-4 accent-blue-600 rounded" />
                      <span className="text-sm text-slate-700">{src.label}</span>
                    </label>
                  ))}
                </div>
                {sources.length === 0 && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Selecciona al menos una fuente.
                  </p>
                )}
              </FormField>

              <FormField label="Nivel de detalle">
                <div className="grid grid-cols-4 gap-1.5">
                  {DETAIL_LEVELS.map((lvl) => (
                    <button key={lvl} onClick={() => setDetailLevel(lvl)}
                      className={`py-2 text-xs rounded-lg border transition-all font-medium
                        ${detailLevel === lvl ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "text-slate-500 border-slate-200 hover:bg-slate-50"}`}>
                      {lvl}
                    </button>
                  ))}
                </div>
              </FormField>
            </div>
          )}

          {/* Credenciales */}
          {activeSection === "credentials" && (
            <div className="p-5 space-y-4 anim-fade-in">
              <p className="text-xs text-slate-500 leading-relaxed">
                Los nombres de las variables se muestran para referencia. Los valores nunca se exponen en esta interfaz.
              </p>
              <div className="space-y-2">
                {motor.credentials.map((cred) => (
                  <div key={cred.name}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors
                      ${cred.loaded ? "bg-white border-slate-200" : "bg-red-50 border-red-200"}`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center
                        ${cred.loaded ? "bg-emerald-50 border border-emerald-200" : "bg-red-100 border border-red-200"}`}>
                        <KeyRound className={`w-3.5 h-3.5 ${cred.loaded ? "text-emerald-600" : "text-red-500"}`} />
                      </div>
                      <code className="text-xs font-mono font-semibold text-slate-700">{cred.name}</code>
                    </div>
                    {cred.loaded ? (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Cargada
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-red-600 bg-red-100 border border-red-200 px-2.5 py-1 rounded-full">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Falta
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => { onClose(); onOpenCredentials(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-blue-700 border-2 border-dashed border-blue-300 rounded-xl hover:bg-blue-50 hover:border-blue-400 transition-all">
                <KeyRound className="w-4 h-4" />
                Administrar credenciales
              </button>
            </div>
          )}

          {/* Previsiones */}
          {activeSection === "fallback" && (
            <div className="p-5 space-y-3 anim-fade-in">
              <p className="text-xs text-slate-500">
                Define el comportamiento del motor ante situaciones inesperadas durante la ejecución.
              </p>
              {FALLBACK_OPTIONS.map((opt) => (
                <label key={opt}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all
                    ${fallback === opt ? "border-blue-400 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"}`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors
                    ${fallback === opt ? "border-blue-500 bg-blue-500" : "border-slate-300 bg-white"}`}
                    onClick={() => setFallback(opt)}>
                    {fallback === opt && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${fallback === opt ? "text-blue-800" : "text-slate-700"}`}>
                      {opt.split("→")[0].trim()}
                    </p>
                    <p className={`text-xs mt-0.5 ${fallback === opt ? "text-blue-600" : "text-slate-400"}`}>
                      → {opt.split("→")[1]?.trim()}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 px-5 py-4 border-t border-slate-200 bg-slate-50 flex gap-2.5">
          <button onClick={onClose} disabled={saveState === "saving"}
            className="flex-1 px-4 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-white transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saveState === "saving" || saveState === "success"}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-white rounded-xl transition-all shadow-sm
              ${saveState === "success"
                ? "bg-emerald-500 shadow-emerald-500/20"
                : saveState === "saving"
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20"
              }`}>
            {saveState === "saving" ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
            ) : saveState === "success" ? (
              <><CheckCircle2 className="w-4 h-4" /> ¡Guardado!</>
            ) : (
              <><Save className="w-4 h-4" /> Guardar configuración</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className={`text-sm text-slate-800 ${mono ? "font-mono" : "font-medium"}`}>{value}</p>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">{label}</label>
      {children}
    </div>
  );
}
