import { useState } from "react";
import {
  Plug, Settings, Power, CheckCircle2, XCircle, AlertCircle,
  Clock, Loader2, Save, Zap, FileText, Download, Eye,
  AlertTriangle, RefreshCw, Sparkles, X,
} from "lucide-react";
import { DSSection, DSSectionHeader, PreviewCard, DSGrid, SpecRow } from "../DSHelpers";

// ════════════════════════════════════════════════════════════════════
//  MOTOR STATES
// ════════════════════════════════════════════════════════════════════
export function MotorStatesSection() {
  const [configuring, setConfiguring] = useState(false);

  const MOTOR_STATES = [
    {
      id: "active",
      label: "Activo",
      desc: "Motor ejecutándose normalmente en su ciclo definido.",
      border: "border-emerald-300",
      bg: "bg-white",
      headerBg: "bg-emerald-50",
      dot: "bg-emerald-500 animate-pulse",
      dotLabel: "text-emerald-700",
      badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
      icon: "text-emerald-600",
      iconBg: "bg-emerald-100 border-emerald-200",
      shadow: "shadow-emerald-100",
      lastRun: "hace 3 min",
      log: "✓ 3 señales procesadas",
    },
    {
      id: "inactive",
      label: "Inactivo",
      desc: "Motor detenido manualmente. No ejecuta ciclos.",
      border: "border-slate-200",
      bg: "bg-white",
      headerBg: "bg-slate-50",
      dot: "bg-slate-400",
      dotLabel: "text-slate-500",
      badge: "bg-slate-100 text-slate-500 border-slate-200",
      icon: "text-slate-400",
      iconBg: "bg-slate-100 border-slate-200",
      shadow: "shadow-slate-100",
      lastRun: "hace 2 h",
      log: "— Detenido manualmente",
    },
    {
      id: "error",
      label: "Error",
      desc: "Motor con falla en la última ejecución. Requiere atención.",
      border: "border-red-300",
      bg: "bg-red-50/30",
      headerBg: "bg-red-50",
      dot: "bg-red-500 animate-pulse",
      dotLabel: "text-red-700",
      badge: "bg-red-100 text-red-700 border-red-200",
      icon: "text-red-500",
      iconBg: "bg-red-100 border-red-200",
      shadow: "shadow-red-100",
      lastRun: "hace 1 h",
      log: "✗ Timeout en API (>30s)",
    },
    {
      id: "selected",
      label: "Seleccionado",
      desc: "Motor activo con foco del usuario. Panel de detalle visible.",
      border: "border-blue-500",
      bg: "bg-blue-50/20",
      headerBg: "bg-blue-50",
      dot: "bg-blue-500",
      dotLabel: "text-blue-700",
      badge: "bg-blue-100 text-blue-700 border-blue-200",
      icon: "text-blue-600",
      iconBg: "bg-blue-100 border-blue-200",
      shadow: "shadow-blue-200",
      lastRun: "hace 5 min",
      log: "✓ 7 señales procesadas",
    },
    {
      id: "saving",
      label: "Guardando…",
      desc: "Configuración en proceso de guardado. UI bloqueada.",
      border: "border-blue-300",
      bg: "bg-white",
      headerBg: "bg-blue-50",
      dot: "bg-blue-400 animate-pulse",
      dotLabel: "text-blue-600",
      badge: "bg-blue-100 text-blue-700 border-blue-200",
      icon: "text-blue-500",
      iconBg: "bg-blue-100 border-blue-200",
      shadow: "shadow-blue-100",
      lastRun: "guardando…",
      log: "↻ Aplicando configuración",
    },
    {
      id: "failing",
      label: "Fallando",
      desc: "Motor en estado crítico con múltiples errores consecutivos.",
      border: "border-red-400",
      bg: "bg-red-50/50",
      headerBg: "bg-red-100",
      dot: "bg-red-600 animate-ping",
      dotLabel: "text-red-800",
      badge: "bg-red-200 text-red-800 border-red-300",
      icon: "text-red-600",
      iconBg: "bg-red-100 border-red-300",
      shadow: "shadow-red-200",
      lastRun: "3 fallos seguidos",
      log: "✗✗✗ Error crítico persistente",
    },
  ];

  return (
    <DSSection id="motor-states">
      <DSSectionHeader
        title="Estados de Motor"
        subtitle="6 estados visuales del componente MotorCard con variaciones claras de color, iconografía y comportamiento."
      />
      <div className="grid grid-cols-3 gap-4">
        {MOTOR_STATES.map((state) => (
          <div key={state.id}
            className={`rounded-2xl border-2 ${state.border} ${state.bg} shadow-sm ${state.shadow} overflow-hidden transition-all`}>
            {/* Card header */}
            <div className={`px-4 py-3 ${state.headerBg} border-b ${state.border}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${state.iconBg}`}>
                    <Plug className={`w-4 h-4 ${state.icon}`} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-mono">v2.4.1</p>
                    <p className="text-xs font-bold text-slate-800">Monitor Noticias</p>
                  </div>
                </div>
                <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${state.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${state.dot}`} />
                  {state.label}
                </span>
              </div>
            </div>
            {/* Card body */}
            <div className="px-4 py-3">
              <p className="text-[10px] text-slate-400 leading-relaxed mb-2">{state.desc}</p>
              <div className="flex items-center gap-3 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {state.lastRun}
                </span>
              </div>
              <div className="mt-2 bg-[#0D1117] rounded-lg px-2.5 py-1.5">
                <p className={`text-[10px] font-mono ${state.dotLabel}`}>{state.log}</p>
              </div>
            </div>
            {/* Card footer */}
            <div className="px-4 py-2.5 border-t border-slate-100 flex items-center gap-1.5">
              {state.id === "saving" ? (
                <button disabled className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] bg-blue-400 text-white rounded-lg cursor-not-allowed opacity-70">
                  <Loader2 className="w-3 h-3 animate-spin" /> Guardando…
                </button>
              ) : (
                <>
                  <button className={`flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors`}>
                    <Settings className="w-3 h-3" /> Config
                  </button>
                  <button className={`flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] rounded-lg border transition-colors
                    ${state.id === "active" || state.id === "selected"
                      ? "border-red-200 text-red-600 hover:bg-red-50"
                      : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                    }`}>
                    <Power className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* State machine diagram */}
      <PreviewCard title="Diagrama de transición de estados">
        <div className="flex items-center justify-center gap-2 flex-wrap py-4">
          {[
            { from: "inactive", to: "active",    action: "activar()",  color: "text-emerald-600" },
            { from: "active",   to: "inactive",  action: "detener()",  color: "text-slate-500" },
            { from: "active",   to: "error",     action: "fallo()",    color: "text-red-500" },
            { from: "error",    to: "active",    action: "reintentar()",color: "text-blue-500" },
            { from: "error",    to: "failing",   action: "3 fallos",   color: "text-red-700" },
            { from: "any",      to: "saving",    action: "guardar()",  color: "text-blue-400" },
            { from: "saving",   to: "any",       action: "onSaved()",  color: "text-emerald-400" },
          ].map(({ from, to, action, color }, i) => (
            <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <span className="text-xs font-mono text-slate-600">{from}</span>
              <span className="text-slate-300">→</span>
              <span className={`text-[10px] font-mono font-semibold ${color}`}>{action}</span>
              <span className="text-slate-300">→</span>
              <span className="text-xs font-mono text-slate-600">{to}</span>
            </div>
          ))}
        </div>
      </PreviewCard>
    </DSSection>
  );
}

// ════════════════════════════════════════════════════════════════════
//  DOCUMENT STATES
// ════════════════════════════════════════════════════════════════════
export function DocStatesSection() {
  const [genState, setGenState] = useState<"idle" | "generating" | "ready" | "error">("idle");
  const [progress, setProgress] = useState(0);

  const simulateGen = () => {
    setGenState("generating");
    setProgress(0);
    const steps = [20, 45, 65, 80, 95, 100];
    steps.forEach((v, i) => setTimeout(() => {
      setProgress(v);
      if (i === steps.length - 1) setTimeout(() => setGenState("ready"), 400);
    }, i * 350));
  };

  return (
    <DSSection id="doc-states">
      <DSSectionHeader
        title="Estados de Documento"
        subtitle="3 estados principales del componente DocumentsTab: Generando, Listo, Error."
      />
      <div className="grid grid-cols-3 gap-4">
        {/* Generating */}
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-600 to-violet-700 overflow-hidden shadow-xl shadow-blue-600/20">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Generando…</p>
                <p className="text-blue-200 text-xs">Procesando señales con IA</p>
              </div>
            </div>
            <div className="bg-black/20 rounded-lg p-3 space-y-2">
              {["Recopilando señales", "Analizando eventos", "Redactando con IA"].map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  {i < 2
                    ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    : <Loader2 className="w-3 h-3 text-blue-300 animate-spin shrink-0" />
                  }
                  <span className={`text-[11px] ${i < 2 ? "text-emerald-300" : "text-blue-200"}`}>{step}</span>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white/80 rounded-full w-[72%] transition-all" />
              </div>
              <p className="text-[10px] text-white/60 mt-1 text-right">72%</p>
            </div>
          </div>
        </div>

        {/* Ready */}
        <div className="rounded-2xl border border-emerald-200 bg-white overflow-hidden shadow-sm">
          <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-3 flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-100 border border-emerald-200 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-emerald-800 font-semibold text-xs">¡Listo!</p>
              <p className="text-emerald-600 text-[10px]">Documento generado · 6 pág.</p>
            </div>
          </div>
          <div className="p-4 space-y-2">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-700 border-b border-slate-200 pb-2 mb-2">Perfil Contextual — TechCorp</p>
              <div className="space-y-1.5">
                {["Resumen ejecutivo", "Señales detectadas", "Oportunidad de venta"].map((s) => (
                  <div key={s} className="h-2 bg-slate-200 rounded-full" style={{ width: `${60 + Math.random() * 40}%` }} />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-500 transition-colors">
                <Download className="w-3.5 h-3.5" /> Exportar
              </button>
              <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-50 transition-colors">
                <Eye className="w-3.5 h-3.5" /> Vista previa
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        <div className="rounded-2xl border border-red-200 bg-red-50/30 overflow-hidden shadow-sm">
          <div className="bg-red-50 border-b border-red-100 px-4 py-3 flex items-center gap-2.5">
            <div className="w-8 h-8 bg-red-100 border border-red-200 rounded-xl flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-red-800 font-semibold text-xs">Error al generar</p>
              <p className="text-red-500 text-[10px]">Timeout en API · cod. 503</p>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="bg-red-100/50 rounded-lg p-3 border border-red-200">
              <p className="text-[11px] font-mono text-red-700 leading-relaxed">
                ERR: API response timeout (&gt;30s)<br />
                Source: openai.generate()<br />
                Retry: 1/3 · próximo: 60s
              </p>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-500 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Reintentar
              </button>
              <button className="flex items-center justify-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-xs hover:bg-red-50 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive demo */}
      <PreviewCard title="Demo interactivo — ciclo completo de generación">
        <div className="flex items-center gap-5">
          <button onClick={simulateGen} disabled={genState === "generating"}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-500 disabled:opacity-60 transition-colors">
            <Sparkles className="w-4 h-4" /> Simular generación
          </button>
          <button onClick={() => { setGenState("idle"); setProgress(0); }}
            className="px-4 py-2.5 text-slate-500 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 transition-colors">
            Reiniciar
          </button>
          <div className="flex-1">
            {genState === "idle" && (
              <p className="text-sm text-slate-400">Estado: <strong className="text-slate-600">Idle</strong> — listo para generar</p>
            )}
            {genState === "generating" && (
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Generando documento…</span>
                    <span className="font-mono">{progress}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            )}
            {genState === "ready" && (
              <div className="flex items-center gap-2 anim-fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <p className="text-sm text-emerald-700 font-semibold">Documento generado exitosamente en 2.1s</p>
              </div>
            )}
          </div>
        </div>
      </PreviewCard>
    </DSSection>
  );
}

// ════════════════════════════════════════════════════════════════════
//  SIGNAL STATES
// ════════════════════════════════════════════════════════════════════
export function SignalStatesSection() {
  const signals = [
    {
      id: "nueva",
      label: "Nueva",
      desc: "Señal recién detectada, pendiente de revisión o procesamiento.",
      bg: "bg-white",
      border: "border-blue-300",
      dot: "bg-blue-500 animate-pulse",
      badge: "bg-blue-100 text-blue-700 border-blue-200",
      iconBg: "bg-blue-100 border-blue-200",
      iconColor: "text-blue-600",
      title: "Serie B · $12M detectada",
      company: "TechCorp Uruguay",
      priority: "Alta",
      priorityColor: "text-red-600",
      time: "hace 2 min",
    },
    {
      id: "procesada",
      label: "Procesada",
      desc: "Señal revisada y marcada como procesada. Se incluye en reportes.",
      bg: "bg-white",
      border: "border-slate-200",
      dot: "bg-emerald-500",
      badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
      iconBg: "bg-emerald-100 border-emerald-200",
      iconColor: "text-emerald-600",
      title: "Expansión LATAM · 3 países",
      company: "RetailCo",
      priority: "Media",
      priorityColor: "text-amber-600",
      time: "hace 1 h",
    },
    {
      id: "ignorada",
      label: "Ignorada",
      desc: "Señal marcada como irrelevante. No aparece en análisis activos.",
      bg: "bg-slate-50",
      border: "border-slate-200",
      dot: "bg-slate-400",
      badge: "bg-slate-100 text-slate-500 border-slate-200",
      iconBg: "bg-slate-100 border-slate-200",
      iconColor: "text-slate-400",
      title: "Contratación +5 personas",
      company: "InnovaGroup",
      priority: "Baja",
      priorityColor: "text-slate-400",
      time: "hace 3 h",
    },
  ];

  return (
    <DSSection id="signal-states">
      <DSSectionHeader
        title="Estados de Señal"
        subtitle="3 estados del componente SignalCard que representan el ciclo de vida de una señal detectada."
      />
      <div className="grid grid-cols-3 gap-4">
        {signals.map((s) => (
          <div key={s.id} className={`rounded-2xl border-2 ${s.border} ${s.bg} p-4 shadow-sm transition-all`}>
            <div className="flex items-start justify-between mb-3">
              <span className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${s.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {s.label}
              </span>
              <span className={`text-[10px] font-bold ${s.priorityColor}`}>● {s.priority}</span>
            </div>
            <div className="flex items-start gap-2.5 mb-3">
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${s.iconBg}`}>
                <Zap className={`w-3.5 h-3.5 ${s.iconColor}`} />
              </div>
              <div>
                <p className={`text-xs font-semibold ${s.id === "ignorada" ? "text-slate-400 line-through" : "text-slate-800"}`}>
                  {s.title}
                </p>
                <p className="text-[10px] text-slate-400">{s.company}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">{s.desc}</p>
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {s.time}
              </span>
              <div className="flex gap-1">
                {s.id === "nueva" && (
                  <>
                    <button className="text-[10px] px-2 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors font-semibold">Procesar</button>
                    <button className="text-[10px] px-2 py-1 text-slate-400 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Ignorar</button>
                  </>
                )}
                {s.id === "procesada" && (
                  <span className="text-[10px] flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="w-3 h-3" /> Completada
                  </span>
                )}
                {s.id === "ignorada" && (
                  <button className="text-[10px] px-2 py-1 text-slate-400 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Restaurar</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <DSGrid cols={2} gap={4}>
        <PreviewCard title="Ciclo de vida de señal">
          <div className="relative flex flex-col gap-0">
            {[
              { step: "Detectada",  color: "bg-violet-500", desc: "Motor identifica un evento relevante", icon: Zap },
              { step: "Nueva",      color: "bg-blue-500",   desc: "Señal creada, esperando revisión",   icon: AlertCircle },
              { step: "Procesada",  color: "bg-emerald-500",desc: "Revisada e incluida en análisis",     icon: CheckCircle2 },
              { step: "Exportada",  color: "bg-slate-400",  desc: "Incluida en documento generado",     icon: FileText },
            ].map(({ step, color, desc, icon: Icon }, i, arr) => (
              <div key={step} className="flex items-start gap-3 pb-4 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center shadow-sm`}>
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  {i < arr.length - 1 && <div className="w-0.5 h-4 bg-slate-200 mt-1" />}
                </div>
                <div className="pt-1">
                  <p className="text-xs font-semibold text-slate-800">{step}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </PreviewCard>
        <PreviewCard title="Especificaciones de señal">
          <div className="space-y-1.5">
            <SpecRow property="Estados posibles" value="nueva · procesada · ignorada" />
            <SpecRow property="Prioridades" value="alta · media · baja" />
            <SpecRow property="Nueva — color" value="#3B82F6 (blue-500)" />
            <SpecRow property="Procesada — color" value="#22C55E (green-500)" />
            <SpecRow property="Ignorada — color" value="#9CA3AF (gray-400)" />
            <SpecRow property="Pulso animado" value="solo estado nueva" />
            <SpecRow property="Tachado texto" value="solo estado ignorada" />
            <SpecRow property="Transición estado" value="200ms ease-out" />
          </div>
        </PreviewCard>
      </DSGrid>
    </DSSection>
  );
}