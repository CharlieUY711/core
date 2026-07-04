import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

export const metadata = { title: "BOM" };

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  draft:        { label: "Borrador",      bg: "#F3F4F6", color: "#4B5563" },
  under_review: { label: "En revisión",   bg: "#FEF9C3", color: "#A16207" },
  approved:     { label: "Aprobado",      bg: "#DCFCE7", color: "#15803D" },
  rfq_sent:      { label: "RFQ enviado",   bg: "#DBEAFE", color: "#1D4ED8" },
  quoted:       { label: "Cotizado",      bg: "#EDE9FE", color: "#6D28D9" },
  ordered:      { label: "Ordenado",      bg: "#E0F2FE", color: "#0369A1" },
  delivered:    { label: "Entregado",     bg: "#F3F4F6", color: "#15803D" },
};

export default async function ProjectBomPage({
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

  const { data: lines, error } = await supabase
    .from("bom_lines")
    .select("id, code, description, quantity, unit, discipline, status, level, version")
    .eq("project_id", params.id)
    .order("level", { ascending: true })
    .order("code", { ascending: true });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "1.5rem 2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{ fontSize: "2rem" }}>📦</div>
        <div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111" }}>BOM</div>
          <div style={{ color: "#9CA3AF", fontSize: "0.875rem", marginTop: 2 }}>
            Lista de materiales — {project.name}
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 16, padding: "1.5rem 2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {error && (
          <p style={{ color: "#DC2626", fontSize: "0.85rem" }}>Error: {error.message}</p>
        )}

        {!lines?.length ? (
          <div style={{ padding: "3rem", textAlign: "center", background: "#FAFAFA", borderRadius: 12, border: "1.5px dashed #E5E7EB" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📂</div>
            <div style={{ fontWeight: 700, color: "#374151", marginBottom: 4 }}>Sin líneas de BOM</div>
            <div style={{ color: "#9CA3AF", fontSize: "0.85rem" }}>Todavía no hay materiales cargados para este proyecto.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1.5px solid #E5E7EB", textAlign: "left" }}>
                  <th style={{ padding: "0.5rem 0.75rem", color: "#9CA3AF", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase" }}>Código</th>
                  <th style={{ padding: "0.5rem 0.75rem", color: "#9CA3AF", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase" }}>Descripción</th>
                  <th style={{ padding: "0.5rem 0.75rem", color: "#9CA3AF", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase" }}>Disciplina</th>
                  <th style={{ padding: "0.5rem 0.75rem", color: "#9CA3AF", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", textAlign: "right" }}>Cant.</th>
                  <th style={{ padding: "0.5rem 0.75rem", color: "#9CA3AF", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase" }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const st = STATUS_LABELS[line.status] ?? STATUS_LABELS.draft;
                  return (
                    <tr key={line.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <td style={{ padding: "0.6rem 0.75rem", fontFamily: "monospace", fontSize: "0.78rem", color: "#6B7280", paddingLeft: `${0.75 + line.level * 1}rem` }}>
                        {line.code}
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "#111" }}>{line.description}</td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "#6B7280" }}>{line.discipline ?? "—"}</td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "#111", textAlign: "right" }}>
                        {line.quantity} {line.unit}
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem" }}>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
