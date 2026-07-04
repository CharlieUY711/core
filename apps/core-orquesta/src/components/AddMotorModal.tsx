import { useState } from "react";
import {
  X, Search, Check, Download, Rss, Globe, Database, Mail,
  TrendingUp, MessageSquare, FileText, BarChart2, Link, Zap,
  CheckCircle2, AlertCircle, Package,
} from "lucide-react";
import type { Motor } from "../data";

interface AvailableMotor {
  id: string;
  name: string;
  description: string;
  icon: string;
  version: string;
  tags: string[];
  credentials: string[];
  installed: boolean;
}

const AVAILABLE: AvailableMotor[] = [
  {
    id: "am1",
    name: "Monitor de Redes Sociales",
    description: "Rastreo de menciones en Twitter/X, LinkedIn e Instagram en tiempo real.",
    icon: "twitter",
    version: "1.2.0",
    tags: ["social", "realtime", "sentimiento"],
    credentials: ["TWITTER_API_KEY", "LINKEDIN_TOKEN"],
    installed: false,
  },
  {
    id: "am2",
    name: "Parser de Documentos PDF",
    description: "Extrae y estructura información de PDFs (balances, reportes, contratos).",
    icon: "file",
    version: "0.9.3",
    tags: ["documentos", "nlp", "ia"],
    credentials: ["PDF_AI_API_KEY"],
    installed: false,
  },
  {
    id: "am3",
    name: "Monitor de Precios Web",
    description: "Seguimiento de precios y variaciones en e-commerce y marketplaces.",
    icon: "barChart",
    version: "2.0.1",
    tags: ["precios", "retail", "competencia"],
    credentials: ["PRICESPY_TOKEN"],
    installed: false,
  },
  {
    id: "am4",
    name: "Conector CRM Salesforce",
    description: "Sincronización bidireccional con Salesforce. Oportunidades, cuentas y contactos.",
    icon: "link",
    version: "3.1.0",
    tags: ["crm", "salesforce", "ventas"],
    credentials: ["SF_CLIENT_ID", "SF_CLIENT_SECRET", "SF_ORG_URL"],
    installed: false,
  },
  {
    id: "am5",
    name: "Alertas por Slack",
    description: "Envía señales y alertas críticas directamente a canales de Slack.",
    icon: "zap",
    version: "1.0.5",
    tags: ["notificaciones", "slack", "alertas"],
    credentials: ["SLACK_WEBHOOK_URL"],
    installed: false,
  },
];

const ICON_MAP: Record<string, React.ElementType> = {
  twitter: MessageSquare, file: FileText, barChart: BarChart2,
  link: Link, zap: Zap, rss: Rss, globe: Globe, database: Database,
  mail: Mail, trending: TrendingUp,
};

const TAG_COLORS: Record<string, string> = {
  social: "bg-sky-100 text-sky-700", realtime: "bg-emerald-100 text-emerald-700",
  sentimiento: "bg-violet-100 text-violet-700", documentos: "bg-amber-100 text-amber-700",
  nlp: "bg-blue-100 text-blue-700", ia: "bg-purple-100 text-purple-700",
  precios: "bg-orange-100 text-orange-700", retail: "bg-pink-100 text-pink-700",
  competencia: "bg-rose-100 text-rose-700", crm: "bg-cyan-100 text-cyan-700",
  salesforce: "bg-sky-100 text-sky-700", ventas: "bg-green-100 text-green-700",
  notificaciones: "bg-yellow-100 text-yellow-700", slack: "bg-indigo-100 text-indigo-700",
  alertas: "bg-red-100 text-red-700",
};

type InstallState = "idle" | "installing" | "done" | "error";

interface AddMotorModalProps {
  onClose: () => void;
  onInstall: (motor: Partial<Motor>) => void;
}

export function AddMotorModal({ onClose, onInstall }: AddMotorModalProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AvailableMotor | null>(null);
  const [installState, setInstallState] = useState<InstallState>("idle");
  const [progress, setProgress] = useState(0);
  const [installed, setInstalled] = useState<Set<string>>(new Set());

  const filtered = AVAILABLE.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.description.toLowerCase().includes(search.toLowerCase()) ||
    m.tags.some((t) => t.includes(search.toLowerCase()))
  );

  const handleInstall = (motor: AvailableMotor) => {
    setSelected(motor);
    setInstallState("installing");
    setProgress(0);

    // Fake progress
    const steps = [15, 35, 55, 72, 88, 95, 100];
    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setProgress(steps[i]);
        i++;
      } else {
        clearInterval(interval);
        setInstallState("done");
        setInstalled((prev) => new Set([...prev, motor.id]));
        // Create the motor object
        setTimeout(() => {
          onInstall({
            id: `installed-${motor.id}`,
            name: motor.name,
            description: motor.description,
            version: motor.version,
            status: "inactive",
            icon: motor.icon.includes("twitter") ? "rss" :
                  motor.icon.includes("barChart") ? "trending" : "globe",
            lastRun: "nunca",
            logs: [
              { time: "—", text: "— Motor instalado, pendiente de activación" },
              { time: "—", text: `— Versión ${motor.version} instalada correctamente` },
              { time: "—", text: "— Configure las credenciales antes de activar" },
            ],
            companies: [],
            interval: 30,
            sources: [],
            detailLevel: "Estándar",
            fallback: "Si falla la fuente → reintentar",
            credentials: motor.credentials.map((name) => ({ name, loaded: false })),
          });
          setTimeout(onClose, 600);
        }, 900);
      }
    }, 400);
  };

  const Icon = selected ? ICON_MAP[selected.icon] || Package : Package;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm anim-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[85vh] flex flex-col anim-scale-in">

        {/* ── Header ── */}
        <div className="bg-[#0B1120] px-5 py-4 flex items-center justify-between border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center">
              <Package className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Marketplace</p>
              <h3 className="text-white font-semibold text-sm">Agregar Motor</h3>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Install progress overlay ── */}
        {installState !== "idle" && selected && (
          <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur flex flex-col items-center justify-center gap-5 anim-fade-in">
            {installState === "installing" && (
              <>
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-xl shadow-blue-500/30">
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-slate-800 font-bold">Instalando {selected.name}</p>
                  <p className="text-slate-400 text-xs mt-0.5">Descargando e inicializando módulo…</p>
                </div>
                <div className="w-72">
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>Progreso</span>
                    <span className="font-mono">{progress}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-2 space-y-1">
                    {["Verificando dependencias", "Descargando módulo", "Configurando entorno"].map((step, i) => (
                      <p key={step} className={`text-[11px] flex items-center gap-1.5 transition-colors
                        ${progress > i * 33 ? "text-emerald-600" : "text-slate-400"}`}>
                        {progress > i * 33
                          ? <CheckCircle2 className="w-3 h-3" />
                          : <div className="w-3 h-3 border border-slate-300 rounded-full" />
                        }
                        {step}
                      </p>
                    ))}
                  </div>
                </div>
              </>
            )}
            {installState === "done" && (
              <div className="text-center space-y-3 anim-scale-in">
                <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-200 flex items-center justify-center mx-auto shadow-lg">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <div>
                  <p className="text-slate-800 font-bold text-base">¡Instalado correctamente!</p>
                  <p className="text-slate-400 text-xs mt-1">{selected.name} agregado al panel de motores</p>
                </div>
                <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
                  Configura las credenciales requeridas antes de activar el motor.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Search ── */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="Buscar motores disponibles…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
        </div>

        {/* ── Motor list ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Sin motores que coincidan con la búsqueda.
            </div>
          ) : (
            filtered.map((motor, idx) => {
              const MIcon = ICON_MAP[motor.icon] || Package;
              const isInstalled = installed.has(motor.id);
              return (
                <div key={motor.id}
                  className="anim-fade-in bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all"
                  style={{ animationDelay: `${idx * 0.04}s` }}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center shrink-0">
                      <MIcon className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-slate-800">{motor.name}</h4>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          v{motor.version}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{motor.description}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {motor.tags.map((tag) => (
                          <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TAG_COLORS[tag] || "bg-slate-100 text-slate-500"}`}>
                            {tag}
                          </span>
                        ))}
                        {motor.credentials.length > 0 && (
                          <span className="text-[10px] text-slate-400 ml-1">
                            {motor.credentials.length} credencial{motor.credentials.length !== 1 ? "es" : ""} requerida{motor.credentials.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isInstalled ? (
                        <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Instalado
                        </span>
                      ) : (
                        <button onClick={() => handleInstall(motor)}
                          className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-xl transition-colors shadow-sm font-semibold">
                          <Download className="w-3.5 h-3.5" />
                          Instalar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Requirements */}
                  {motor.credentials.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {motor.credentials.map((cred) => (
                        <span key={cred} className="flex items-center gap-1 text-[10px] font-mono bg-slate-50 border border-slate-200 text-slate-500 px-2 py-0.5 rounded-lg">
                          <AlertCircle className="w-2.5 h-2.5 text-amber-500" />
                          {cred}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">{AVAILABLE.length} motores disponibles en el marketplace</p>
          <button onClick={onClose}
            className="px-4 py-2 text-xs text-slate-600 border border-slate-200 rounded-xl hover:bg-white transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}