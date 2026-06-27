import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const metadata = { title: "Cumplimiento" };

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  pending:             { label: "Pendiente",        bg: "#F3F4F6", color: "#4B5563" },
  in_review:           { label: "En revisión",      bg: "#FEF9C3", color: "#A16207" },
  compliant:           { label: "Cumple",           bg: "#DCFCE7", color: "#15803D" },
  non_compliant:       { label: "No cumple",        bg: "#FEE2E2", color: "#DC2626" },
  exception_requested: { label: "Excepción pedida", bg: "#EDE9FE", color: "#6D28D9" },
  waived:              { label: "Exceptuado",       bg: "#E0F2FE", color: "#0369A1" },
};

export default async function ProjectCompliancePage({
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

  // compliance_matrix es el registro de seguimiento; requirements aporta el
  // texto del requisito original. Se hace join explícito vía el embed de Supabase.
  const { data: matrix, error } = await supabase
    .from("compliance_matrix")
    .select(`
      id, status, evidence, notes, reviewed_at,
      requirements ( id, article_ref, text, type, discipline )
    `)
    .eq("project_id", params.id)
    .order("created_at", { ascending: false });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "1.5rem 2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{ fontSize: "2rem" }}>✅</div>
        <div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111" }}>Cumplimiento</div>
          <div style={{ color: "#9CA3AF", fontSize: "0.875rem", marginTop: 2 }}>
            Matriz de cumplimiento — {project.name}
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 16, padding: "1.5rem 2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {error && (
          <p style={{ color: "#DC2626", fontSize: "0.85rem" }}>Error: {error.message}</p>
        )}

        {!matrix?.length ? (
          <div style={{ padding: "3rem", textAlign: "center", background: "#FAFAFA", borderRadius: 12, border: "1.5px dashed #E5E7EB" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📂</div>
            <div style={{ fontWeight: 700, color: "#374151", marginBottom: 4 }}>Sin entradas en la matriz</div>
            <div style={{ color: "#9CA3AF", fontSize: "0.85rem" }}>
              Todavía no hay seguimiento de cumplimiento cargado para este proyecto.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {matrix.map((row) => {
              const st = STATUS_LABELS[row.status] ?? STATUS_LABELS.pending;
              const req = row.requirements as any;
              return (
                <div key={row.id} style={{ border: "1.5px solid #E5E7EB", borderRadius: 12, padding: "1rem 1.25rem", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "#6B7280", background: "#F3F4F6", padding: "2px 8px", borderRadius: 6, flexShrink: 0, marginTop: 2 }}>
                    {req?.article_ref ?? "—"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "#111", fontSize: "0.85rem", lineHeight: 1.45, margin: 0 }}>
                      {req?.text ?? "Requisito no encontrado"}
                    </p>
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: 6, fontSize: "0.72rem", color: "#9CA3AF" }}>
                      {req?.type && <span>{req.type}</span>}
                      {req?.discipline && <><span>·</span><span>{req.discipline}</span></>}
                    </div>
                    {row.evidence && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #F3F4F6", fontSize: "0.78rem", color: "#6B7280" }}>
                        <strong style={{ color: "#374151" }}>Evidencia:</strong> {row.evidence}
                      </div>
                    )}
                    {row.notes && (
                      <div style={{ marginTop: 4, fontSize: "0.78rem", color: "#6B7280" }}>
                        <strong style={{ color: "#374151" }}>Notas:</strong> {row.notes}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: st.bg, color: st.color, whiteSpace: "nowrap" }}>
                      {st.label}
                    </span>
                    {row.reviewed_at && (
                      <span style={{ fontSize: "0.68rem", color: "#9CA3AF" }}>
                        Revisado {new Date(row.reviewed_at).toLocaleDateString("es-UY")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
