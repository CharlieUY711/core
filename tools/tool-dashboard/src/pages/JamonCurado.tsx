// JamonCurado.tsx — Placeholder (Desarrollo Comercial › Jamón Curado)
// Seguir el mismo patrón que AceiteDeOliva.tsx cuando se implemente.

import { BRAND } from "../components/brand/Brand";

export default function JamonCurado() {
  return (
    <div style={{
      background: "#fff", borderRadius: "12px",
      padding: "2.5rem 2rem",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: "0.75rem", minHeight: "320px", textAlign: "center",
    }}>
      <span style={{ fontSize: "3rem" }}>🥩</span>
      <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#111" }}>
        Jamón Curado
      </h2>
      <p style={{ color: "#6B7280", fontSize: "0.9rem", maxWidth: "400px", lineHeight: 1.6, margin: 0 }}>
        Esta sección está en desarrollo. Aquí se mostrará el plan comercial,
        modelo económico y estrategia para el producto Jamón Curado.
      </p>
      <span style={{
        marginTop: "0.25rem", fontSize: "0.75rem", fontWeight: 700,
        background: `rgba(201,168,76,0.1)`, color: BRAND.primary,
        padding: "4px 14px", borderRadius: "999px",
      }}>
        Próximamente
      </span>
    </div>
  );
}
