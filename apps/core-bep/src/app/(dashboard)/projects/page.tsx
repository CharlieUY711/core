import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus } from "lucide-react";

export const metadata = { title: "Proyectos" };

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: "Borrador",    bg: "#F3F4F6", color: "#4B5563" },
  active:    { label: "Activo",      bg: "#DCFCE7", color: "#15803D" },
  on_hold:   { label: "En pausa",    bg: "#FEF9C3", color: "#A16207" },
  submitted: { label: "Presentado",  bg: "#DBEAFE", color: "#1D4ED8" },
  awarded:   { label: "Adjudicado",  bg: "#EDE9FE", color: "#6D28D9" },
  lost:      { label: "No adjud.",   bg: "#FEE2E2", color: "#DC2626" },
  closed:    { label: "Cerrado",     bg: "#F3F4F6", color: "#6B7280" },
};

const ACCENT = "#3D5689";

export default async function ProjectsPage() {
  const supabase = createClient();
  const { data: projects, error } = await supabase
    .from("projects")
    .select(`id, code, name, description, status, deadline, created_at, workspaces ( name, organizations ( name ) )`)
    .order("created_at", { ascending: false });

  if (error) return <p style={{ color: "#DC2626", fontSize: "0.875rem" }}>Error: {error.message}</p>;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem", fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "1.5rem 2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ fontSize: "2rem" }}>📁</div>
          <div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111" }}>Proyectos</div>
            <div style={{ color: "#9CA3AF", fontSize: "0.875rem", marginTop: 2 }}>
              {projects?.length ?? 0} proyecto{projects?.length !== 1 ? "s" : ""} en tu organización
            </div>
          </div>
        </div>
        <Link href="/projects/new"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0.6rem 1.25rem", background: ACCENT, color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: "0.875rem", textDecoration: "none" }}>
          <Plus size={16} /> Nuevo proyecto
        </Link>
      </div>

      {/* Grid */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {!projects?.length ? (
          <div style={{ padding: "3rem", textAlign: "center", background: "#FAFAFA", borderRadius: 12, border: "1.5px dashed #E5E7EB" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📂</div>
            <div style={{ fontWeight: 700, color: "#374151", marginBottom: 4 }}>No hay proyectos todavía</div>
            <div style={{ color: "#9CA3AF", fontSize: "0.85rem", marginBottom: "1.25rem" }}>Creá tu primer proyecto para comenzar.</div>
            <Link href="/projects/new" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0.6rem 1.25rem", background: ACCENT, color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: "0.875rem", textDecoration: "none" }}>
              <Plus size={16} /> Crear proyecto
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {projects.map((project) => {
              const ws = project.workspaces as any;
              const org = ws?.organizations as any;
              const st = STATUS[project.status] ?? STATUS.draft;
              return (
                <Link key={project.id} href={`/projects/${project.id}`}
                  style={{ display: "block", textDecoration: "none", border: "1.5px solid #E5E7EB", borderRadius: 12, padding: "1.25rem", background: "#fff", transition: "all 0.15s" }}>
                  <p style={{ fontSize: "0.7rem", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                    {org?.name} › {ws?.name}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontFamily: "monospace", fontSize: "0.75rem", background: "#F3F4F6", color: "#6B7280", padding: "2px 8px", borderRadius: 6 }}>{project.code}</span>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  <div style={{ fontWeight: 600, color: "#111", fontSize: "0.9rem", lineHeight: 1.4, marginBottom: 6 }}>{project.name}</div>
                  {project.description && (
                    <div style={{ fontSize: "0.8rem", color: "#6B7280", lineHeight: 1.5, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {project.description}
                    </div>
                  )}
                  <div style={{ fontSize: "0.75rem", color: "#9CA3AF", paddingTop: 8, borderTop: "1px solid #F3F4F6" }}>
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
    </div>
  );
}
