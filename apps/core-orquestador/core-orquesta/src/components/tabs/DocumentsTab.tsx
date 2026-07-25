import { useState } from "react";
import {
  FileText, Sparkles, Download, Copy, Eye,
  Clock, FilePlus, CheckCircle2, Mail, Printer,
  AlertCircle, Loader2, X,
} from "lucide-react";
import type { Company } from "../../data";

type DocType = "perfil" | "reporte" | "brief" | "alerta";
type GenState = "idle" | "generating" | "success" | "error";

const DOC_TYPE_CFG: Record<DocType, { label: string; bg: string; text: string; border: string }> = {
  perfil:  { label: "Perfil",  bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200" },
  reporte: { label: "Reporte", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  brief:   { label: "Brief",   bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200" },
  alerta:  { label: "Alerta",  bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
};

interface DocItem { id: string; title: string; type: DocType; generatedAt: string; pages: number; }

const MOCK_DOCS: DocItem[] = [
  { id: "d1", title: "Perfil Contextual — TechCorp Uruguay", type: "perfil",  generatedAt: "24/02/2026 17:30", pages: 6 },
  { id: "d2", title: "Reporte de Señales Q1 2026",           type: "reporte", generatedAt: "24/02/2026 12:00", pages: 12 },
  { id: "d3", title: "Brief Ejecutivo — Expansión LATAM",    type: "brief",   generatedAt: "23/02/2026 18:45", pages: 3 },
  { id: "d4", title: "Alerta: Riesgo detectado en RetailCo", type: "alerta",  generatedAt: "22/02/2026 09:10", pages: 2 },
];

const GEN_STEPS = [
  { label: "Recopilando señales activas",    delay: 0    },
  { label: "Analizando eventos recientes",   delay: 450  },
  { label: "Construyendo perfil contextual", delay: 900  },
  { label: "Redactando documento con IA",    delay: 1400 },
  { label: "Revisión y formato final",       delay: 1800 },
];

function buildPreview(company: Company): string {
  return `# Perfil Contextual — ${company.name}
**Generado por Orquestador · IA** | 24 de febrero de 2026

---

## Resumen Ejecutivo

${company.summary}

## Señales Clave Identificadas

${company.verticals.map((v) => `**${v.label}:** ${v.value}`).join("\n")}

## Análisis de Oportunidad

Ventana comercial activa en los próximos 60–90 días. Se recomienda contacto proactivo con el equipo de toma de decisiones.

## Motores que contribuyeron

- Monitor de Noticias
- Web Scraper  
- Analizador de Señales`;
}

export function DocumentsTab({ company }: { company: Company }) {
  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(MOCK_DOCS[0]);
  const [docs, setDocs] = useState<DocItem[]>(MOCK_DOCS);
  const [genState, setGenState] = useState<GenState>("idle");
  const [genProgress, setGenProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const preview = buildPreview(company);

  const handleGenerate = () => {
    if (genState === "generating") return;
    setGenState("generating");
    setGenProgress(0);
    setCompletedSteps([]);

    GEN_STEPS.forEach((step, i) => {
      setTimeout(() => {
        setCompletedSteps((prev) => [...prev, i]);
        setGenProgress(Math.round(((i + 1) / GEN_STEPS.length) * 100));
      }, step.delay + 300);
    });

    setTimeout(() => {
      const newDoc: DocItem = {
        id: `d-${Date.now()}`,
        title: `Perfil Contextual — ${company.name}`,
        type: "perfil",
        generatedAt: new Date().toLocaleString("es-UY", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        }),
        pages: 5,
      };
      setDocs((prev) => [newDoc, ...prev]);
      setSelectedDoc(newDoc);
      setGenState("success");
      setTimeout(() => setGenState("idle"), 4000);
    }, 2600);
  };

  return (
    <div className="space-y-4">

      {/* ── Generate card ─────────────────────────────────────── */}
      <div className={`rounded-2xl overflow-hidden border shadow-lg transition-all
        ${genState === "success" ? "border-emerald-200" : genState === "error" ? "border-red-200" : "border-transparent"}`}>

        {/* Header */}
        <div className={`p-4 flex items-center justify-between
          ${genState === "success"
            ? "bg-gradient-to-r from-emerald-600 to-green-600"
            : genState === "error"
            ? "bg-gradient-to-r from-red-600 to-red-700"
            : "bg-gradient-to-br from-blue-600 via-blue-600 to-violet-700"
          }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center shadow-inner">
              {genState === "success"
                ? <CheckCircle2 className="w-5 h-5 text-white" />
                : genState === "error"
                ? <AlertCircle className="w-5 h-5 text-white" />
                : <Sparkles className="w-5 h-5 text-white" />
              }
            </div>
            <div>
              <p className="text-white font-bold text-sm">Generar documento con IA</p>
              <p className="text-white/70 text-xs mt-0.5">
                {genState === "generating"
                  ? "Procesando señales y construyendo contexto…"
                  : genState === "success"
                  ? "¡Documento listo y guardado en la lista!"
                  : <>Basado en señales activas de <strong>{company.name}</strong></>
                }
              </p>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={genState === "generating" || genState === "success"}
            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-50 transition-all disabled:opacity-70 shadow-md whitespace-nowrap"
          >
            {genState === "generating"
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generando…</>
              : genState === "success"
              ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ¡Listo!</>
              : <><FilePlus className="w-3.5 h-3.5" /> Generar</>
            }
          </button>
        </div>

        {/* Progress */}
        {genState === "generating" && (
          <div className="bg-[#0D1117] px-4 py-3.5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${genProgress}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400 font-mono w-8 text-right tabular-nums">{genProgress}%</span>
            </div>
            <div className="space-y-1.5">
              {GEN_STEPS.map((step, i) => (
                <div key={step.label} className="flex items-center gap-2">
                  {completedSteps.includes(i)
                    ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    : i === completedSteps.length
                    ? <Loader2 className="w-3 h-3 text-blue-400 animate-spin shrink-0" />
                    : <div className="w-3 h-3 rounded-full border border-slate-700 shrink-0" />
                  }
                  <span className={`text-[11px] font-mono transition-colors ${
                    completedSteps.includes(i) ? "text-emerald-400" :
                    i === completedSteps.length ? "text-blue-300" : "text-slate-600"
                  }`}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success bar */}
        {genState === "success" && (
          <div className="bg-emerald-50 border-t border-emerald-200 px-4 py-2.5 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <p className="text-xs text-emerald-700 font-medium">Documento generado y añadido a la lista.</p>
          </div>
        )}
      </div>

      {/* ── Doc list + preview ────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3.5" style={{ minHeight: 360 }}>

        {/* Doc list */}
        <div className="col-span-2 flex flex-col gap-2.5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Documentos <span className="font-mono text-slate-400 ml-0.5">({docs.length})</span>
          </p>
          <div className="space-y-1.5">
            {docs.map((doc, idx) => {
              const t = DOC_TYPE_CFG[doc.type];
              const isActive = selectedDoc?.id === doc.id;
              return (
                <button key={doc.id} onClick={() => setSelectedDoc(doc)}
                  className={`anim-fade-in w-full text-left p-3.5 rounded-2xl border transition-all
                    ${isActive
                      ? "border-blue-300 bg-blue-50 shadow-sm ring-1 ring-blue-200/40"
                      : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm"
                    }`}
                  style={{ animationDelay: `${idx * 0.04}s` }}>
                  <div className="flex items-start gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${t.bg} ${t.border}`}>
                      <FileText className={`w-4 h-4 ${t.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] font-semibold leading-snug ${isActive ? "text-blue-800" : "text-slate-700"}`}>
                        {doc.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${t.bg} ${t.text} ${t.border}`}>
                          {t.label}
                        </span>
                        <span className="text-[10px] text-slate-400">{doc.pages}p</span>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                        <Clock className="w-2.5 h-2.5" />
                        {doc.generatedAt}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview pane */}
        <div className="col-span-3 flex flex-col">
          {selectedDoc ? (
            <div className="flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1">
              {/* Toolbar */}
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-semibold text-slate-600">Vista previa</span>
                  <span className="text-[10px] text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md ml-1">
                    {selectedDoc.pages} pág.
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {[{ icon: Copy, title: "Copiar" }, { icon: Printer, title: "Imprimir" }, { icon: Mail, title: "Enviar" }].map(({ icon: Icon, title }) => (
                    <button key={title} title={title}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200">
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  ))}
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[11px] font-bold hover:bg-blue-500 transition-colors ml-1 shadow-sm shadow-blue-600/25">
                    <Download className="w-3 h-3" />
                    Exportar
                  </button>
                </div>
              </div>

              {/* Document content */}
              <div className="flex-1 p-5 overflow-y-auto">
                {preview.split("\n").map((line, i) => {
                  if (line.startsWith("# "))
                    return <h2 key={i} className="text-slate-900 border-b border-slate-200 pb-2.5 mb-4 font-bold">{line.slice(2)}</h2>;
                  if (line.startsWith("## "))
                    return <h3 key={i} className="text-slate-700 font-bold text-xs mt-5 mb-2.5 uppercase tracking-widest">{line.slice(3)}</h3>;
                  if (line.match(/^\*\*(.+)\*\*$/))
                    return <p key={i} className="text-slate-700 font-semibold text-xs mt-2">{line.slice(2, -2)}</p>;
                  if (line.startsWith("- "))
                    return <p key={i} className="text-slate-500 text-xs pl-3 border-l-2 border-blue-200 mb-1.5 leading-relaxed">{line.slice(2)}</p>;
                  if (line === "---")
                    return <hr key={i} className="border-slate-200 my-4" />;
                  if (!line.trim())
                    return <div key={i} className="h-2" />;
                  return <p key={i} className="text-slate-500 text-xs leading-relaxed">{line}</p>;
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center border-2 border-dashed border-slate-200 rounded-2xl p-6">
              <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center mb-2 border border-slate-200">
                <FileText className="w-5 h-5 text-slate-300" />
              </div>
              <p className="text-sm text-slate-400">Selecciona un documento</p>
              <p className="text-xs text-slate-300 mt-1">para ver la vista previa</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
