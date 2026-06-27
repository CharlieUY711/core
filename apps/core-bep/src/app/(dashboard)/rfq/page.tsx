import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const metadata = { title: "RFQ / Cotizaciones" };

const ACCENT = "#3D5689";

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: "Borrador",    bg: "#F3F4F6", color: "#4B5563" },
  active:    { label: "Activo",      bg: "#DCFCE7", color: "#15803D" },
  on_hold:   { label: "En pausa",    bg: "#FEF9C3", color: "#A16207" },
  submitted: { label: "Presentado",  bg: "#DBEAFE", color: "#1D4ED8" },
  awarded:   { label: "Adjudicado",  bg: "#EDE9FE", color: "#6D28D9" },
  lost:      { label: "No adjud.",   bg: "#FEE2E2", color: "#DC2626" },
  closed:    { label: "Cerrado",     bg: "#F3F4F6", color: "#6B7280" },
};

export default async function Page() {
  const supabase = createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, code, name, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem", fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "1.5rem 2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{ fontSize: "2rem" }}>🛒</div>
        <div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111" }}>RFQ / Cotizaciones</div>
          <div style={{ color: "#9CA3AF", fontSize: "0.875rem", marginTop: 2 }}>Solicitudes de cotización por proyecto</div>
        </div>
      </div>

      {/* Selector */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ fontWeight: 700, fontSize: "1rem", color: "#111", marginBottom: 4 }}>Seleccioná un proyecto</div>
        <div style={{ color: "#9CA3AF", fontSize: "0.8rem", marginBottom: "1.25rem" }}>Elegí el proyecto para acceder a este módulo.</div>

        {!projects?.length ? (
          <div style={{ padding: "3rem", textAlign: "center", background: "#FAFAFA", borderRadius: 12, border: "1.5px dashed #E5E7EB" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📂</div>
            <div style={{ fontWeight: 700, color: "#374151", marginBottom: 4 }}>Sin proyectos</div>
            <div style={{ color: "#9CA3AF", fontSize: "0.85rem" }}>No hay proyectos disponibles aún.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
            {projects.map((p) => {
              const st = STATUS_LABELS[p.status] ?? STATUS_LABELS.draft;
              return (
                <Link key={p.id} href={/projects//rfq}
                  style={{ display: "block", textDecoration: "none", border: "1.5px solid #E5E7EB", borderRadius: 12, padding: "1.25rem", background: "#fff", transition: "box-shadow 0.15s, border-color 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLElement).style.borderColor = ACCENT; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.borderColor = "#E5E7EB"; }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontFamily: "monospace", fontSize: "0.75rem", background: "#F3F4F6", color: "#6B7280", padding: "2px 8px", borderRadius: 6 }}>{p.code}</span>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  <div style={{ fontWeight: 600, color: "#111", fontSize: "0.9rem", lineHeight: 1.4 }}>{p.name}</div>
                  <div style={{ marginTop: 8, fontSize: "0.75rem", color: "#9CA3AF" }}>
                    Creado {new Date(p.created_at).toLocaleDateString("es-UY")}
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
