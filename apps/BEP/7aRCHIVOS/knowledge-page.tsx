import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const metadata = { title: "Wiki técnica" };

export default async function ProjectKnowledgePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, code")
    .eq("id", params.id)
    .single();

  if (!project) notFound();

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "1.5rem 2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{ fontSize: "2rem" }}>📖</div>
        <div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111" }}>Wiki técnica</div>
          <div style={{ color: "#9CA3AF", fontSize: "0.875rem", marginTop: 2 }}>
            Base de conocimiento — {project.name}
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 16, padding: "2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ padding: "3rem", textAlign: "center", background: "#FAFAFA", borderRadius: 12, border: "1.5px dashed #E5E7EB" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🚧</div>
          <div style={{ fontWeight: 700, color: "#374151", marginBottom: 4 }}>Módulo en construcción</div>
          <div style={{ color: "#9CA3AF", fontSize: "0.85rem" }}>
            La base de conocimiento todavía no está disponible para este proyecto.
          </div>
        </div>
      </div>
    </div>
  );
}
