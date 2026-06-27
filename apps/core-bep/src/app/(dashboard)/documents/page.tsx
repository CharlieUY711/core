import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { FolderOpen, Plus, Clock, Building2 } from "lucide-react";

export const metadata = { title: "Proyectos" };

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:     { label: "Borrador",   color: "bg-gray-100 text-gray-600" },
  active:    { label: "Activo",     color: "bg-green-100 text-green-700" },
  on_hold:   { label: "En pausa",   color: "bg-yellow-100 text-yellow-700" },
  submitted: { label: "Presentado", color: "bg-blue-100 text-blue-700" },
  awarded:   { label: "Adjudicado", color: "bg-brand-100 text-brand-700" },
  lost:      { label: "No adjud.",  color: "bg-red-100 text-red-600" },
  closed:    { label: "Cerrado",    color: "bg-gray-100 text-gray-500" },
};

export default async function ProjectsPage() {
  const supabase = createClient();

  // Usuario autenticado
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Proyectos donde el usuario es miembro
  const { data: memberships } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", user.id);

  const projectIds = memberships?.map((m) => m.project_id) ?? [];

  // Org del usuario (primera org a la que pertenece via project_members)
  const { data: projects, error } = await supabase
    .from("projects")
    .select(`
      id, code, name, description, status, currency, deadline, created_at,
      workspaces (
        name,
        organizations ( id, name, logo_url )
      )
    `)
    .in("id", projectIds.length ? projectIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-red-600 text-sm">Error: {error.message}</p>;
  }

  // Org del primer proyecto (para el header)
  const firstOrg = (projects?.[0]?.workspaces as any)?.organizations;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {/* Logo de la organización */}
          {firstOrg?.logo_url ? (
            <img
              src={firstOrg.logo_url}
              alt={firstOrg.name}
              className="h-10 w-10 rounded-lg object-contain border border-gray-100"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
              <Building2 size={18} className="text-brand-400" />
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">
              {firstOrg?.name ?? "Organización"}
            </p>
            <h1 className="text-2xl font-semibold text-gray-900">Proyectos</h1>
            <p className="text-sm text-gray-500">
              {projects?.length ?? 0} proyecto{projects?.length !== 1 ? "s" : ""} asignados a vos
            </p>
          </div>
        </div>
        <Link href="/projects/new" className="bep-btn-primary">
          <Plus size={16} />
          Nuevo proyecto
        </Link>
      </div>

      {/* Grid */}
      {!projects?.length ? (
        <div className="bep-card p-16 text-center">
          <FolderOpen size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No tenés proyectos asignados</p>
          <p className="text-sm text-gray-400 mt-1">
            Pedile a un bid manager que te agregue a un proyecto.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => {
            const ws = project.workspaces as any;
            const org = ws?.organizations as any;
            const statusMeta = STATUS_LABELS[project.status] ?? STATUS_LABELS.draft;

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="bep-card p-5 hover:shadow-md transition-shadow block"
              >
                {/* Org logo + nombre */}
                <div className="flex items-center gap-2 mb-3">
                  {org?.logo_url ? (
                    <img
                      src={org.logo_url}
                      alt={org.name}
                      className="h-6 w-6 rounded object-contain border border-gray-100"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded bg-brand-50 flex items-center justify-center flex-shrink-0">
                      <Building2 size={12} className="text-brand-400" />
                    </div>
                  )}
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide truncate">
                    {org?.name} › {ws?.name}
                  </p>
                </div>

                {/* Code + status */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {project.code}
                  </span>
                  <span className={`bep-badge ${statusMeta.color}`}>
                    {statusMeta.label}
                  </span>
                </div>

                {/* Name */}
                <h2 className="font-medium text-gray-900 text-sm leading-snug mb-2 line-clamp-2">
                  {project.name}
                </h2>

                {/* Description */}
                {project.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                    {project.description}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center gap-2 text-xs text-gray-400 pt-3 border-t border-gray-100">
                  <Clock size={12} />
                  {project.deadline
                    ? `Vence ${new Date(project.deadline).toLocaleDateString("es-UY")}`
                    : `Creado ${new Date(project.created_at).toLocaleDateString("es-UY")}`}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}