import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, FileText, Zap } from "lucide-react";
import { DS_NAV } from "./ds-tokens";
import {
  IdentitySection, ColorsSection, TypographySection, SpacingSection, ElevationSection,
} from "./FoundationSections";
import { IconSection } from "./IconSection";
import {
  ButtonSection, InputSection, CardSection, ModalSection, TabSection,
  TableSection, TimelineSection, AlertSection, ConsoleSection,
} from "./ComponentSections";
import { DSSection, DSSectionHeader, PreviewCard } from "./DSHelpers";
import type { MotorStatus, SignalStatus } from "../data";

interface DesignSystemPageProps {
  onBack: () => void;
}

// ── Estados del sistema Orquestador (motor / documento / señal) ──────────
function SystemStatesSection() {
  const MOTOR_STATES: Array<{ key: MotorStatus; label: string; dot: string; bg: string; text: string; desc: string }> = [
    { key: "active",   label: "Activo",   dot: "bg-emerald-500", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", desc: "El motor está ejecutándose según su intervalo configurado." },
    { key: "inactive", label: "Inactivo", dot: "bg-slate-400",   bg: "bg-slate-100 border-slate-200",    text: "text-slate-500",   desc: "El motor está detenido manualmente o nunca fue activado." },
    { key: "error",    label: "Error",    dot: "bg-red-500",     bg: "bg-red-50 border-red-200",         text: "text-red-700",     desc: "Falló la última ejecución; requiere atención (credenciales, conexión, etc.)." },
  ];

  const DOC_STATES = [
    { label: "Generando…", icon: Zap,          bg: "bg-blue-50 border-blue-200",       text: "text-blue-700",    desc: "IA está construyendo el documento a partir de señales activas." },
    { label: "Listo",      icon: CheckCircle2, bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", desc: "Documento generado y disponible para vista previa / exportar." },
    { label: "Error",      icon: XCircle,      bg: "bg-red-50 border-red-200",         text: "text-red-700",     desc: "Falló la generación; se puede reintentar." },
  ];

  const SIGNAL_STATES: Array<{ key: SignalStatus; label: string; bg: string; text: string; desc: string }> = [
    { key: "nueva",     label: "Nueva",     bg: "bg-blue-100 text-blue-700 border-blue-200",       text: "text-blue-700",    desc: "Recién detectada, pendiente de revisión." },
    { key: "procesada", label: "Procesada", bg: "bg-emerald-100 text-emerald-700 border-emerald-200", text: "text-emerald-700", desc: "Revisada e incorporada al contexto de la empresa." },
    { key: "ignorada",  label: "Ignorada",  bg: "bg-slate-100 text-slate-400 border-slate-200",    text: "text-slate-400",   desc: "Descartada por el usuario o por baja relevancia." },
  ];

  return (
    <DSSection id="motor-states">
      <DSSectionHeader
        title="Estados del Sistema Orquestador"
        subtitle="Estados semánticos reutilizados en motores, documentos y señales en toda la interfaz."
      />
      <PreviewCard title="Estados de Motor">
        <div className="grid grid-cols-3 gap-3">
          {MOTOR_STATES.map((s) => (
            <div key={s.key} className={`p-4 rounded-2xl border ${s.bg}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                <span className={`text-sm font-bold ${s.text}`}>{s.label}</span>
              </div>
              <p className={`text-xs ${s.text} opacity-80 leading-relaxed`}>{s.desc}</p>
            </div>
          ))}
        </div>
      </PreviewCard>

      <div id="doc-states">
        <PreviewCard title="Estados de Documento">
          <div className="grid grid-cols-3 gap-3">
            {DOC_STATES.map(({ label, icon: Icon, bg, text, desc }) => (
              <div key={label} className={`p-4 rounded-2xl border ${bg}`}>
                <Icon className={`w-4 h-4 mb-1.5 ${text}`} />
                <p className={`text-sm font-bold ${text}`}>{label}</p>
                <p className={`text-xs ${text} opacity-80 leading-relaxed mt-1`}>{desc}</p>
              </div>
            ))}
          </div>
        </PreviewCard>
      </div>

      <div id="signal-states">
        <PreviewCard title="Estados de Señal">
          <div className="flex flex-wrap gap-2.5">
            {SIGNAL_STATES.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${s.bg}`}>{s.label}</span>
                <span className="text-xs text-slate-400">{s.desc}</span>
              </div>
            ))}
          </div>
        </PreviewCard>
      </div>
    </DSSection>
  );
}

export function DesignSystemPage({ onBack }: DesignSystemPageProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* ── Sidebar nav ─────────────────────────────────────────── */}
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-slate-50 overflow-y-auto">
        <div className="p-4 border-b border-slate-200">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al Dashboard
          </button>
        </div>
        <nav className="p-3 space-y-5">
          {DS_NAV.map((group) => (
            <div key={group.group}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 mb-1.5">
                {group.emoji} {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block px-2 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-white hover:text-blue-700 transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Content ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8">
          <div className="pt-8 pb-2 flex items-center gap-2 text-slate-400 text-xs">
            <FileText className="w-3.5 h-3.5" />
            Orquestador Design System
          </div>
          <IdentitySection />
          <ColorsSection />
          <TypographySection />
          <SpacingSection />
          <ElevationSection />
          <IconSection />
          <ButtonSection />
          <InputSection />
          <CardSection />
          <ModalSection />
          <TabSection />
          <TableSection />
          <TimelineSection />
          <AlertSection />
          <ConsoleSection />
          <SystemStatesSection />
          <div className="h-16" />
        </div>
      </main>
    </div>
  );
}
