import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const metadata = { title: "Documentos" };

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  pending:    { label: "Pendiente",   bg: "#F3F4F6", color: "#4B5563" },
  processing: { label: "Procesando", bg: "#FEF9C3", color: "#A16207" },
  indexed:    { label: "Indexado",   bg: "#DCFCE7", color: "#15803D" },
  error:      { label: "Error",      bg: "#FEE2E2", color: "#DC2626" },
};

const TYPE_LABELS: Record<string, string> = {
  pliego: "Pliego", plano: "Plano", anexo: "Anexo", norma: "Norma",
  contrato: "Contrato", memoria: "Memoria", ficha_tecnica: "Ficha técnica",
  catalogo: "Catálogo", rfq: "RFQ", cotizacion: "Cotización",
  circular: "Circular", consulta: "Consulta", correo: "Correo", otro: "Otro",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function ProjectDocumentsPage({
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

  const { data: documents, error } = await supabase
    .from("documents")
    .select("id, name, type, status, discipline, size_bytes, ai_summary, created_at")
    .eq("project_id", params.id)
    .order("created_at", { ascending: false });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "1.5rem 2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{ fontSize: "2rem" }}>📄</div>
        <div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111" }}>Documentos</div>
          <div style={{ color: "#9CA3AF", fontSize: "0.875rem", marginTop: 2 }}>
            Planos, pliegos y anexos — {project.name}
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 16, padding: "1.5rem 2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {error && (
          <p style={{ color: "#DC2626", fontSize: "0.85rem" }}>Error: {error.message}</p>
        )}

        {!documents?.length ? (
          <div style={{ padding: "3rem", textAlign: "center", background: "#FAFAFA", borderRadius: 12, border: "1.5px dashed #E5E7EB" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📂</div>
            <div style={{ fontWeight: 700, color: "#374151", marginBottom: 4 }}>Sin documentos</div>
            <div style={{ color: "#9CA3AF", fontSize: "0.85rem" }}>Todavía no se subieron documentos a este proyecto.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {documents.map((doc) => {
              const st = STATUS_LABELS[doc.status] ?? STATUS_LABELS.pending;
              return (
                <div key={doc.id} style={{ border: "1.5px solid #E5E7EB", borderRadius: 12, padding: "1.1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6B7280", background: "#F3F4F6", padding: "2px 8px", borderRadius: 6 }}>
                      {TYPE_LABELS[doc.type] ?? doc.type}
                    </span>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: st.bg, color: st.color, whiteSpace: "nowrap" }}>
                      {st.label}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, color: "#111", fontSize: "0.88rem", lineHeight: 1.35, marginBottom: 6 }}>
                    {doc.name}
                  </div>
                  {doc.ai_summary && (
                    <p style={{ color: "#9CA3AF", fontSize: "0.78rem", lineHeight: 1.4, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {doc.ai_summary}
                    </p>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#9CA3AF", paddingTop: 8, borderTop: "1px solid #F3F4F6" }}>
                    <span>{doc.discipline ?? "—"}</span>
                    <span>{formatBytes(doc.size_bytes)}</span>
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
