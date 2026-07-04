import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const metadata = { title: "Consultas" };

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  // project_queries.status es texto libre, no enum — labels son best-effort
  // y caen a un default neutro si aparece un valor no previsto.
  pending:   { label: "Pendiente",  bg: "#F3F4F6", color: "#4B5563" },
  open:      { label: "Abierta",    bg: "#FEF9C3", color: "#A16207" },
  answered:  { label: "Respondida", bg: "#DCFCE7", color: "#15803D" },
  closed:    { label: "Cerrada",    bg: "#F3F4F6", color: "#6B7280" },
};

const DEFAULT_STATUS = { label: "—", bg: "#F3F4F6", color: "#6B7280" };

export default async function ProjectQueriesPage({
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

  const { data: queries, error } = await supabase
    .from("project_queries")
    .select(`
      id, question, answer, status, answered_at, created_at,
      circulars ( ref, title )
    `)
    .eq("project_id", params.id)
    .order("created_at", { ascending: false });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "1.5rem 2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{ fontSize: "2rem" }}>💬</div>
        <div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111" }}>Consultas</div>
          <div style={{ color: "#9CA3AF", fontSize: "0.875rem", marginTop: 2 }}>
            Consultas técnicas — {project.name}
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 16, padding: "1.5rem 2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {error && (
          <p style={{ color: "#DC2626", fontSize: "0.85rem" }}>Error: {error.message}</p>
        )}

        {!queries?.length ? (
          <div style={{ padding: "3rem", textAlign: "center", background: "#FAFAFA", borderRadius: 12, border: "1.5px dashed #E5E7EB" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📂</div>
            <div style={{ fontWeight: 700, color: "#374151", marginBottom: 4 }}>Sin consultas</div>
            <div style={{ color: "#9CA3AF", fontSize: "0.85rem" }}>
              Todavía no se registraron consultas para este proyecto.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {queries.map((q) => {
              const st = STATUS_LABELS[q.status] ?? DEFAULT_STATUS;
              const circular = q.circulars as any;
              return (
                <div key={q.id} style={{ border: "1.5px solid #E5E7EB", borderRadius: 12, padding: "1rem 1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                    <p style={{ color: "#111", fontSize: "0.88rem", fontWeight: 600, lineHeight: 1.4, margin: 0 }}>
                      {q.question}
                    </p>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: st.bg, color: st.color, whiteSpace: "nowrap" }}>
                      {st.label}
                    </span>
                  </div>

                  {q.answer ? (
                    <p style={{ color: "#374151", fontSize: "0.82rem", lineHeight: 1.45, margin: "0 0 8px 0", paddingLeft: "0.75rem", borderLeft: "2px solid #E5E7EB" }}>
                      {q.answer}
                    </p>
                  ) : (
                    <p style={{ color: "#9CA3AF", fontSize: "0.78rem", fontStyle: "italic", margin: "0 0 8px 0" }}>
                      Sin respuesta todavía
                    </p>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#9CA3AF", paddingTop: 8, borderTop: "1px solid #F3F4F6" }}>
                    <span>{circular ? `Circular ${circular.ref}` : "Sin circular asociada"}</span>
                    <span>
                      {q.answered_at
                        ? `Respondida ${new Date(q.answered_at).toLocaleDateString("es-UY")}`
                        : `Creada ${new Date(q.created_at).toLocaleDateString("es-UY")}`}
                    </span>
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
