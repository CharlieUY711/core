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
  color: string;
  lbl: React.CSSProperties;
  inp: React.CSSProperties;
}

const columna: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: "0.6rem",
};
const dos: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem",
};
const check: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.82rem",
};

/* ── Monedas y tipo de cambio ───────────────────────────────────────────── */
export function BloqueMonedas({ form, setForm, color, lbl, inp }: PropsBloque) {
  const attrs = (form.atributos ?? {}) as any;
  const set = (k: string, v: unknown) =>
    setForm({ ...form, atributos: { ...(form.atributos || {}), [k]: v } });

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem",
      padding: "0.5rem 0.75rem", background: "#F8F9FB", borderRadius: 8,
      border: "1px solid #EAECF0", alignItems: "end",
    }}>
      <div>
        <span style={lbl}>Moneda principal</span>
        <select style={inp} value={form.moneda || "UYU"}
          onChange={(e) => setForm({ ...form, moneda: e.target.value })}>
          {["UYU", "USD", "EUR", "ARS", "BRL"].map((m) => <option key={m}>{m}</option>)}
        </select>
      </div>

      <div>
        <span style={lbl}>Moneda secundaria</span>
        <select style={inp} value={attrs.moneda_sec || "USD"}
          onChange={(e) => set("moneda_sec", e.target.value)}>
          {["USD", "EUR", "UYU", "ARS", "BRL"].map((m) => <option key={m}>{m}</option>)}
        </select>
      </div>

      {/*
        Acá había un campo de tipo de cambio, un check "Auto" y una fuente con
        fecha y hora, guardados en `atributos` de cada artículo — o sea que
        cada artículo podía tener el suyo.

        Un artículo no tiene tipo de cambio propio. El TC es de la plataforma y
        es el oficial del BCU: lo escribe la Edge Function `tipo-de-cambio` en
        `exchange_rates` y lo leen igual la vidriera y el checkout. La tienda
        lo toma de la plataforma, no lo define.

        Lo que sí es del artículo, y queda, es la moneda: en qué moneda está su
        precio.
      */}
    </div>
  );
}

/* ── Detalles: identificación, garantía y envío ─────────────────────────── */
export function BloqueDetalles({ form, setForm, color, lbl, inp }: PropsBloque) {
  return (
    <div style={columna}>
      <div style={dos}>
        <div>
          <span style={lbl}>SKU</span>
          <input style={inp} value={form.sku || ""}
            onChange={(e) => setForm({ ...form, sku: e.target.value })} />
        </div>
        <div>
          <span style={lbl}>Garantía tipo</span>
          <select style={inp} value={form.garantia_tipo || ""}
            onChange={(e) => setForm({ ...form, garantia_tipo: e.target.value })}>
            <option value="">Sin garantía</option>
            <option value="vendedor">Del vendedor</option>
            <option value="fabrica">De fábrica</option>
          </select>
        </div>
      </div>

      <div style={dos}>
        <div>
          <span style={lbl}>Garantía (meses)</span>
          <input type="number" min={0} style={inp} value={form.garantia_meses || ""}
            onChange={(e) => setForm({ ...form, garantia_meses: parseInt(e.target.value) || undefined })} />
        </div>
        <div>
          <span style={lbl}>Peso kg</span>
          <input type="number" min={0} step="0.1" style={inp} value={form.peso_kg || ""}
            onChange={(e) => setForm({ ...form, peso_kg: parseFloat(e.target.value) || undefined })} />
        </div>
      </div>

      <div>
        <span style={lbl}>Tipo de envío</span>
        <select style={inp} value={form.envio_tipo || "retiro"}
          onChange={(e) => setForm({ ...form, envio_tipo: e.target.value })}>
          <option value="retiro">Solo retiro</option>
          <option value="custom">Envío propio</option>
          <option value="meli_like">Tipo MercadoEnvíos</option>
          <option value="pickup">Pickup point</option>
        </select>
      </div>

      <label style={check}>
        <input type="checkbox" checked={!!form.envio_gratis} style={{ accentColor: color }}
          onChange={(e) => setForm({ ...form, envio_gratis: e.target.checked })} />
        Envío gratis
      </label>
    </div>
  );
}

/* ── Inventario y estado de publicación ─────────────────────────────────── */
export function BloqueInventario({ form, setForm, color, lbl, inp }: PropsBloque) {
  return (
    <div style={columna}>
      <div style={dos}>
        <div>
          <span style={lbl}>Stock</span>
          {/* Deshabilitado cuando es ilimitado, no oculto: el número anterior
              sigue a la vista para cuando se desmarque. */}
          <input type="number" min={0} style={inp}
            value={form.stock ?? 1}
            disabled={!!form.stock_ilimitado}
            onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 4 }}>
          <label style={check}>
            <input type="checkbox" checked={!!form.stock_ilimitado} style={{ accentColor: color }}
              onChange={(e) => setForm({ ...form, stock_ilimitado: e.target.checked })} />
            Ilimitado
          </label>
        </div>
      </div>

      <div>
        <span style={lbl}>Estado de publicación</span>
        <select style={inp} value={form.status || "draft"}
          onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="draft">Borrador</option>
          <option value="active">Publicar ahora</option>
          <option value="paused">Pausado</option>
        </select>
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
