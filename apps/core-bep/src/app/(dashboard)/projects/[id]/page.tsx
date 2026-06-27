import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  FileText, List, CheckSquare, ShoppingCart,
  AlertTriangle, MessageSquare, ArrowLeft
} from "lucide-react";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase
    .from("projects")
    .select("name, code")
    .eq("id", params.id)
    .single();
  return { title: data ? `${data.code} — ${data.name}` : "Proyecto" };
}

const MODULES = [
  { href: "documents",  label: "Documentos",   icon: FileText,       desc: "Planos, pliegos, anexos" },
  { href: "bom",        label: "BOM",           icon: List,           desc: "Lista maestra de materiales" },
  { href: "compliance", label: "Cumplimiento",  icon: CheckSquare,    desc: "Matriz de requisitos" },
  { href: "rfq",        label: "RFQ",           icon: ShoppingCart,   desc: "Solicitudes de cotización" },
  { href: "risks",      label: "Riesgos",       icon: AlertTriangle,  desc: "Registro de riesgos" },
  { href: "queries",    label: "Consultas",     icon: MessageSquare,  desc: "Circulares y consultas" },
];

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: project } = await supabase
    .from("projects")
    .select(`
      *,
      workspaces ( name, organizations ( name ) )
    `)
    .eq("id", params.id)
    .single();

  if (!project) notFound();

  const ws = project.workspaces as any;
  const org = ws?.organizations as any;

  // Quick stats
  const [
    { count: docCount },
    { count: bomCount },
    { count: reqCount },
    { count: riskCount },
  ] = await Promise.all([
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("project_id", params.id),
    supabase.from("bom_lines").select("*", { count: "exact", head: true }).eq("project_id", params.id),
    supabase.from("requirements").select("*", { count: "exact", head: true }).eq("project_id", params.id),
    supabase.from("risks").select("*", { count: "exact", head: true }).eq("project_id", params.id),
  ]);

  return (
    <div>
      {/* Breadcrumb */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6"
      >
        <ArrowLeft size={14} />
        Proyectos
      </Link>

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
          {org?.name} › {ws?.name}
        </p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {project.code}
              </span>
              <span className="bep-badge bg-green-100 text-green-700">{project.status}</span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-gray-500 mt-1 max-w-2xl">{project.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Documentos",  value: docCount  ?? 0 },
          { label: "Líneas BOM",  value: bomCount  ?? 0 },
          { label: "Requisitos",  value: reqCount  ?? 0 },
          { label: "Riesgos",     value: riskCount ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="bep-card p-4">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Module cards */}
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
        Módulos
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {MODULES.map(({ href, label, icon: Icon, desc }) => (
          <Link
            key={href}
            href={`/projects/${params.id}/${href}`}
            className="bep-card p-5 flex items-start gap-4 hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
              <Icon size={18} className="text-brand-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
