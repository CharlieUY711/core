import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const metadata = { title: "Riesgos" };

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  open:       { label: "Abierto",     bg: "#FEE2E2", color: "#DC2626" },
  mitigating: { label: "Mitigando",  bg: "#FEF9C3", color: "#A16207" },
  closed:     { label: "Cerrado",    bg: "#F3F4F6", color: "#6B7280" },
  accepted:   { label: "Aceptado",   bg: "#E0F2FE", color: "#0369A1" },
};

const LEVEL_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  low:      { label: "Bajo",    bg: "#DCFCE7", color: "#15803D" },
  medium:   { label: "Medio",   bg: "#FEF9C3", color: "#A16207" },
  high:     { label: "Alto",    bg: "#FFEDD5", color: "#C2410C" },
  critical: { label: "Crítico", bg: "#FEE2E2", color: "#DC2626" },
};

export default async function ProjectRisksPage({
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

  const { data: risks, error } = await supabase
    .from("risks")
    .select("id, title, description, probability, impact, status, mitigation, due_date")
    .eq("project_id", params.id)
    .order("created_at", { ascending: false });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "1.5rem 2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{ fontSize: "2rem" }}>⚠️</div>
        <div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111" }}>Riesgos</div>
          <div style={{ color: "#9CA3AF", fontSize: "0.875rem", marginTop: 2 }}>
            Registro de riesgos — {project.name}
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 16, padding: "1.5rem 2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {error && (
          <p style={{ color: "#DC2626", fontSize: "0.85rem" }}>Error: {error.message}</p>
        )}

        {!risks?.length ? (
          <div style={{ padding: "3rem", textAlign: "center", background: "#FAFAFA", borderRadius: 12, border: "1.5px dashed #E5E7EB" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📂</div>
            <div style={{ fontWeight: 700, color: "#374151", marginBottom: 4 }}>Sin riesgos registrados</div>
            <div style={{ color: "#9CA3AF", fontSize: "0.85rem" }}>Todavía no hay riesgos cargados para este proyecto.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {risks.map((risk) => {
              const st = STATUS_LABELS[risk.status] ?? STATUS_LABELS.open;
              const prob = LEVEL_LABELS[risk.probability] ?? LEVEL_LABELS.medium;
              const imp = LEVEL_LABELS[risk.impact] ?? LEVEL_LABELS.medium;
              return (
                <div key={risk.id} style={{ border: "1.5px solid #E5E7EB", borderRadius: 12, padding: "1rem 1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, color: "#111", fontSize: "0.9rem" }}>{risk.title}</div>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: st.bg, color: st.color, whiteSpace: "nowrap" }}>
                      {st.label}
                    </span>
                  </div>
                  {risk.description && (
                    <p style={{ color: "#6B7280", fontSize: "0.8rem", lineHeight: 1.4, margin: "0 0 8px 0" }}>
                      {risk.description}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.72rem" }}>
                    <span style={{ color: "#9CA3AF" }}>Probabilidad:</span>
                    <span style={{ fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: prob.bg, color: prob.color }}>{prob.label}</span>
                    <span style={{ color: "#9CA3AF", marginLeft: 8 }}>Impacto:</span>
                    <span style={{ fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: imp.bg, color: imp.color }}>{imp.label}</span>
                    {risk.due_date && (
                      <span style={{ color: "#9CA3AF", marginLeft: "auto" }}>
                        Vence {new Date(risk.due_date).toLocaleDateString("es-UY")}
                      </span>
                    )}
                  </div>
                  {risk.mitigation && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #F3F4F6", fontSize: "0.78rem", color: "#6B7280" }}>
                      <strong style={{ color: "#374151" }}>Mitigación:</strong> {risk.mitigation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
