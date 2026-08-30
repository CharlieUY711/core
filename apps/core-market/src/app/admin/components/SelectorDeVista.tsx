/**
 * Lista · Grandes · Medianos · Chicos.
 *
 * DÓNDE VA
 * A la derecha de la barra, al lado de "Columnas". Los dos son controles de
 * presentación —no cambian qué hay, cambian cómo se ve— y agruparlos evita que
 * el usuario los busque en lados distintos.
 *
 * "COLUMNAS" SÓLO EXISTE EN LISTA
 * Elegir columnas de una grilla de íconos no quiere decir nada. Quien use esto
 * decide si muestra "Columnas" según la vista; acá sólo se elige la vista.
 */
import { VISTAS, Vista } from "../ui/vistas";

const ICONO: Record<Vista, string> = {
  lista:    "☰",
  grandes:  "▢",
  medianos: "▤",
  chicos:   "▦",
};

export function SelectorDeVista({
  vista, onVista,
}: {
  vista: Vista;
  onVista: (v: Vista) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {VISTAS.map(v => {
        const activa = v.id === vista;
        return (
          <button key={v.id} onClick={() => onVista(v.id)} title={v.label}
            style={{
              padding: "0.3rem 0.45rem", borderRadius: 6, cursor: "pointer",
              border: `1.5px solid ${activa ? "var(--brand-madre)" : "transparent"}`,
              background: activa ? "color-mix(in srgb, var(--brand-madre) 8%, transparent)" : "transparent",
              color: activa ? "var(--brand-madre)" : "#6B7280",
              fontSize: "0.85rem", lineHeight: 1,
            }}>
            {ICONO[v.id]}
          </button>
        );
      })}
    </div>
  );
}

export default SelectorDeVista;
