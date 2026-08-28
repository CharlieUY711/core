/**
 * Bloques de la ficha del artículo.
 *
 * POR QUÉ ESTÁN ACÁ Y NO EN LA PANTALLA
 * Vivían dentro de las pestañas del editor de AdminPublicaciones, así que el
 * alta —que es el mismo formulario con los campos vacíos— no podía usarlos:
 * tenía que reimplementarlos. Eso ya nos costó caro en esta sesión: dos listas
 * de condiciones, dos lecturas del error de publicación, dos catálogos. Cada
 * vez que arreglamos una versión, la otra quedó atrás.
 *
 * Extraídos, alta y edición muestran lo mismo porque es el mismo código.
 *
 * CONTRATO
 * Todos reciben `{ form, setForm, color, lbl, inp }`, el mismo que ya usaba
 * PreciosEditor. Son controlados y no guardan nada: quién persiste y cuándo lo
 * decide la pantalla, que es la que sabe si está creando o editando.
 *
 * No tienen título ni encabezado propio. Dónde van y cómo se anuncian es
 * decisión del lugar que los use; incrustar un <h2> acá obligaría a pelearlo
 * después desde afuera.
 */
import React from "react";

export interface PropsBloque {
  form: any;
  setForm: (f: any) => void;
  /** Sin uso desde que se fueron los checks; se deja opcional por compatibilidad. */
  color?: string;
  lbl: React.CSSProperties;
  inp: React.CSSProperties;
}

const columna: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: "0.6rem",
};
const dos: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem",
};

/*
 * Acá vivían BloqueMonedas y BloqueInventario. Se borran, no se reubican.
 *
 * El formulario unificado ya tiene lo suyo y mejor: la moneda salió del
 * selector propio -que además convierte el precio al cambiarla-, el stock
 * tiene su campo, y el estado de publicación es el par "Publicar ahora /
 * Guardar borrador". Ponerlos igual habría dejado dos lugares para editar lo
 * mismo, que es exactamente lo que esta extracción vino a terminar.
 *
 * El tipo de cambio se fue antes y por otro motivo: es de la plataforma, no
 * del artículo (ver la Edge Function `tipo-de-cambio`).
 *
 * Lo único que sobrevive es lo que el formulario NO tenía.
 */

/* ── Detalles: identificación, garantía y envío ─────────────────────────── */
export function BloqueDetalles({ form, setForm, lbl, inp }: PropsBloque) {
  /*
   * Cada campo es una columna de `catalog_producto_base` y se guarda con
   * `guardar_detalles_articulo`. Antes esto tenía `garantia_tipo`,
   * `garantia_meses`, `peso_kg` y `envio_gratis`, que no existen en ninguna
   * tabla: se escribían y se perdían al recargar.
   *
   * Garantía y tipo de envío son datos que pide Mercado Libre. Hasta ahora la
   * única forma de completarlos era a mano en la base.
   */
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  return (
    <div style={columna}>
      <div style={dos}>
        <div>
          <span style={lbl}>Garantía</span>
          <input style={inp} value={form.garantia || ""} placeholder="12 meses de fábrica"
            onChange={(e) => set("garantia", e.target.value)} />
        </div>
        <div>
          <span style={lbl}>Tipo de envío</span>
          <select style={inp} value={form.tipo_envio || ""}
            onChange={(e) => set("tipo_envio", e.target.value)}>
            <option value="">Sin definir</option>
            <option value="retiro">Solo retiro</option>
            <option value="propio">Envío propio</option>
            <option value="courier">Courier / paquetería</option>
          </select>
        </div>
      </div>

      <div style={dos}>
        <div>
          <span style={lbl}>Peso</span>
          <input style={inp} value={form.peso || ""} placeholder="1,2 kg"
            onChange={(e) => set("peso", e.target.value)} />
        </div>
        <div>
          <span style={lbl}>Dimensiones</span>
          <input style={inp} value={form.dimensiones || ""} placeholder="30 × 20 × 10 cm"
            onChange={(e) => set("dimensiones", e.target.value)} />
        </div>
      </div>

      <div style={dos}>
        <div>
          <span style={lbl}>Material</span>
          <input style={inp} value={form.material || ""} placeholder="Aluminio y vidrio"
            onChange={(e) => set("material", e.target.value)} />
        </div>
        <div>
          <span style={lbl}>Origen</span>
          <input style={inp} value={form.origen || ""} placeholder="Importado de China"
            onChange={(e) => set("origen", e.target.value)} />
        </div>
      </div>

    </div>
  );
}

/* ── Métricas ───────────────────────────────────────────────────────────── */
/**
 * Sólo lectura: no recibe form ni setForm porque no hay nada que editar.
 * Pedirlos igual, "por consistencia", haría creer que se puede escribir.
 */
export function BloqueMetricas({ a }: { a: any }) {
  const filas = [
    { l: "Impresiones", v: a?.impresiones || 0 },
    { l: "Clicks",      v: a?.clicks || 0 },
    { l: "CTR",         v: (a?.impresiones ? (((a.clicks || 0) / a.impresiones) * 100).toFixed(1) : 0) + "%" },
    { l: "Ranking",     v: a?.ranking_score ? Number(a.ranking_score).toFixed(3) : "—" },
    { l: "Rating",      v: a?.rating_promedio ? Number(a.rating_promedio).toFixed(1) + " ★" : "—" },
    { l: "Reseñas",     v: a?.rating_count || 0 },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "5px" }}>
      {filas.map((m) => (
        <div key={m.l} style={{ background: "#fff", borderRadius: 7,
          padding: "0.38rem 0.5rem", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "9px", color: "var(--gray-400)", textTransform: "uppercase" }}>{m.l}</div>
          <div style={{ fontWeight: 700, color: "#374151", fontSize: "0.85rem" }}>{m.v}</div>
        </div>
      ))}
    </div>
  );
}
