import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const metadata = { title: "RFQ" };

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  draft:    { label: "Borrador",  bg: "#F3F4F6", color: "#4B5563" },
  sent:     { label: "Enviado",   bg: "#DBEAFE", color: "#1D4ED8" },
  partial:  { label: "Parcial",  bg: "#FEF9C3", color: "#A16207" },
  complete: { label: "Completo", bg: "#DCFCE7", color: "#15803D" },
  closed:   { label: "Cerrado",  bg: "#F3F4F6", color: "#6B7280" },
};

export default async function ProjectRfqPage({
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

  const { data: rfqs, error } = await supabase
    .from("rfqs")
    .select("id, code, title, status, sent_at, due_at, notes")
    .eq("project_id", params.id)
    .order("created_at", { ascending: false });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "1.5rem 2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{ fontSize: "2rem" }}>🛒</div>
        <div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111" }}>RFQ / Cotizaciones</div>
          <div style={{ color: "#9CA3AF", fontSize: "0.875rem", marginTop: 2 }}>
            Solicitudes de cotización — {project.name}
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 16, padding: "1.5rem 2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {error && (
          <p style={{ color: "#DC2626", fontSize: "0.85rem" }}>Error: {error.message}</p>
        )}

        {!rfqs?.length ? (
          <div style={{ padding: "3rem", textAlign: "center", background: "#FAFAFA", borderRadius: 12, border: "1.5px dashed #E5E7EB" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📂</div>
            <div style={{ fontWeight: 700, color: "#374151", marginBottom: 4 }}>Sin RFQs</div>
            <div style={{ color: "#9CA3AF", fontSize: "0.85rem" }}>Todavía no se enviaron solicitudes de cotización para este proyecto.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {rfqs.map((rfq) => {
              const st = STATUS_LABELS[rfq.status] ?? STATUS_LABELS.draft;
              return (
                <div key={rfq.id} style={{ border: "1.5px solid #E5E7EB", borderRadius: 12, padding: "1.1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontFamily: "monospace", fontSize: "0.75rem", background: "#F3F4F6", color: "#6B7280", padding: "2px 8px", borderRadius: 6 }}>
                      {rfq.code}
                    </span>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, color: "#111", fontSize: "0.9rem", lineHeight: 1.4, marginBottom: 8 }}>
                    {rfq.title}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>
                    {rfq.sent_at && <div>Enviado: {new Date(rfq.sent_at).toLocaleDateString("es-UY")}</div>}
                    {rfq.due_at && <div>Vence: {new Date(rfq.due_at).toLocaleDateString("es-UY")}</div>}
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
