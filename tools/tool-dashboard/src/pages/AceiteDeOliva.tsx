// ─────────────────────────────────────────────────────────────────────────────
// AceiteDeOliva.tsx — Página de Desarrollo Comercial › Aceite de Oliva
// Arquitectura: React 18 + Vite + TypeScript estricto
// Convenciones: estilos inline, sin deps nuevas, sin CSS externo.
// Reutiliza los mismos patrones de card, tabla y layout de AdminDashboard,
// AdminAnalytics y AdminOrders.
// ─────────────────────────────────────────────────────────────────────────────

import { BRAND } from "../components/brand/Brand";

// ─── Datos estáticos ──────────────────────────────────────────────────────────

const PRECIO_VENTA    = 3990;
const PRECIO_NETO     = 3305;   // precio venta / 1.205 (descuento MP)
const COSTO_COMPRA    = 1600;
const FLETE           = 350;
const MARKETING_PCT   = 0.10;
const MARKETING       = Math.round(PRECIO_NETO * MARKETING_PCT);
const COSTOS_VENTA    = PRECIO_NETO - PRECIO_VENTA;  // descuento pasarela ~685
const MARGEN_CONTRIB  = PRECIO_NETO - COSTO_COMPRA - FLETE - MARKETING;

const CF_EMPLEADO     = 60_000;
const CF_SISTEMAS     = 5_000;
const CF_DEPOSITO     = 15_000;
const CF_TOTAL        = CF_EMPLEADO + CF_SISTEMAS + CF_DEPOSITO;

const PUNTO_EQUILIBRIO = Math.ceil(CF_TOTAL / MARGEN_CONTRIB);

const planComercial = [
  { mes: 1,  bidones: 100,  facturacion: 399_000  },
  { mes: 2,  bidones: 125,  facturacion: 498_750  },
  { mes: 3,  bidones: 150,  facturacion: 598_500  },
  { mes: 4,  bidones: 200,  facturacion: 798_000  },
  { mes: 5,  bidones: 275,  facturacion: 1_097_250 },
  { mes: 6,  bidones: 350,  facturacion: 1_396_500 },
  { mes: 7,  bidones: 450,  facturacion: 1_795_500 },
  { mes: 8,  bidones: 550,  facturacion: 2_194_500 },
  { mes: 9,  bidones: 650,  facturacion: 2_593_500 },
  { mes: 10, bidones: 775,  facturacion: 3_092_250 },
  { mes: 11, bidones: 900,  facturacion: 3_591_000 },
  { mes: 12, bidones: 1_000, facturacion: 3_990_000 },
];

const estrategias = [
  { icon: "📧", label: "Activación de newsletter",        desc: "Captación temprana de leads interesados en productos gourmet." },
  { icon: "🌱", label: "Contenido orgánico",               desc: "Posts educativos sobre beneficios del aceite de oliva extra virgen." },
  { icon: "⚙️", label: "Email marketing automatizado",    desc: "Secuencias de nurturing post-compra y recuperación de carrito." },
  { icon: "🤝", label: "Programa de referidos",            desc: "Descuento para el referidor y el referido en la siguiente compra." },
  { icon: "📈", label: "Publicidad digital escalable",     desc: "Meta Ads con optimización hacia ROAS, escalado mensual." },
  { icon: "💎", label: "Fidelización",                     desc: "Beneficios exclusivos para clientes con 3+ compras." },
  { icon: "🔄", label: "Recompra",                         desc: "Recordatorios automáticos alineados al ciclo de consumo (30–45 días)." },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const $ = (n: number) =>
  `$U ${n.toLocaleString("es-UY")}`;

// ─── Sub-componentes reutilizables (mismos tokens visuales del dashboard) ─────

/** Card de KPI — idéntica a AdminDashboard y AdminAnalytics */
function KpiCard({
  label, value, color, icon,
}: {
  label: string;
  value: string | number;
  color: string;
  icon?: string;
}) {
  return (
    <div style={{
      background: "#fff", borderRadius: "12px",
      padding: "1.25rem 1.5rem",
      borderLeft: `4px solid ${color}`,
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      {icon && (
        <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>{icon}</div>
      )}
      <div style={{ color: "#6B7280", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
        {label}
      </div>
      <div style={{ fontWeight: 800, fontSize: "1.4rem", color: "#111" }}>
        {value}
      </div>
    </div>
  );
}

/** Card contenedor — mismo fondo/sombra que todas las secciones del dashboard */
function Section({
  title, children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "#fff", borderRadius: "12px",
      padding: "1.5rem",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <h3 style={{
        margin: "0 0 1.25rem", fontSize: "1rem",
        fontWeight: 700, color: "#444",
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

/** Fila de tabla con estilo zebra — igual que AdminOrders */
function TableRow({
  cells, idx, bold,
}: {
  cells: (string | number)[];
  idx: number;
  bold?: boolean;
}) {
  return (
    <tr style={{
      borderBottom: "1px solid #F3F4F6",
      background: bold ? "#F9FAFB" : (idx % 2 === 0 ? "#fff" : "#FAFAFA"),
    }}>
      {cells.map((cell, i) => (
        <td key={i} style={{
          padding: "0.85rem 1rem",
          fontSize: "0.85rem",
          color: bold ? "#111" : "#444",
          fontWeight: bold ? 700 : (i === 0 ? 600 : 400),
        }}>
          {cell}
        </td>
      ))}
    </tr>
  );
}

/** Encabezado de tabla — igual que AdminOrders */
function TableHead({ headers }: { headers: string[] }) {
  return (
    <thead>
      <tr style={{ background: "#F9FAFB", borderBottom: "2px solid #E5E7EB" }}>
        {headers.map(h => (
          <th key={h} style={{
            padding: "0.85rem 1rem", textAlign: "left",
            fontSize: "0.75rem", fontWeight: 700,
            color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            {h}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AceiteDeOliva() {

  // ── Datos del modelo económico ──
  const modeloEconomico = [
    { concepto: "Precio de venta",          valor: $(PRECIO_VENTA),   color: BRAND.primary  },
    { concepto: "Precio neto (sin MP)",      valor: $(PRECIO_NETO),    color: "#3B82F6"      },
    { concepto: "Costo de compra",           valor: $(COSTO_COMPRA),   color: "#EF4444"      },
    { concepto: "Flete",                     valor: $(FLETE),          color: "#F59E0B"      },
    { concepto: "Marketing (10% neto)",      valor: $(MARKETING),      color: "#8B5CF6"      },
    { concepto: "Costos de venta (pasarela)", valor: `${$(Math.abs(COSTOS_VENTA))} (descuento)`, color: "#6B7280" },
    { concepto: "Margen de contribución",    valor: $(MARGEN_CONTRIB), color: "#6BB87A"      },
  ];

  // ── Costos fijos ──
  const costosFijos = [
    { rubro: "Empleado (part-time)",  monto: CF_EMPLEADO  },
    { rubro: "Sistemas",              monto: CF_SISTEMAS  },
    { rubro: "Depósito",              monto: CF_DEPOSITO  },
  ];

  // ── Facturación total proyectada (año 1) ──
  const facturacionAnual = planComercial.reduce((s, r) => s + r.facturacion, 0);
  const bidonesAnuales   = planComercial.reduce((s, r) => s + r.bidones, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Resumen Ejecutivo ─────────────────────────────────────────── */}
      <div style={{
        background: "#fff", borderRadius: "12px",
        padding: "1.5rem",
        borderLeft: `4px solid ${BRAND.primary}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <span style={{ fontSize: "1.75rem" }}>🌿</span>
          <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#111" }}>
            Aceite de Oliva Extra Virgen — Resumen Ejecutivo
          </h2>
        </div>
        <p style={{ fontSize: "0.9rem", color: "#6B7280", lineHeight: 1.65, margin: 0 }}>
          Comercialización de aceite de oliva extra virgen premium en bidones de 5 litros,
          orientada al canal digital directo (D2C). El modelo se apoya en email marketing,
          contenido orgánico y recompra recurrente, con una proyección de escalar de
          <strong style={{ color: "#111" }}> 100 a 1.000 bidones mensuales</strong> en 12 meses.
          El precio de venta es de <strong style={{ color: "#111" }}>$U 3.990</strong> por bidon,
          con un margen de contribución unitario de{" "}
          <strong style={{ color: "#6BB87A" }}>{$(MARGEN_CONTRIB)}</strong> y un punto de
          equilibrio de <strong style={{ color: "#111" }}>{PUNTO_EQUILIBRIO} bidones/mes</strong>.
        </p>
      </div>

      {/* ── Dashboard de KPIs ─────────────────────────────────────────── */}
      <div>
        <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", fontWeight: 700,
          color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Dashboard de KPIs
        </h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "1rem",
        }}>
          <KpiCard label="Precio de venta"        value={$(PRECIO_VENTA)}    color={BRAND.primary} icon="💰" />
          <KpiCard label="Meta mensual (año 1)"   value="1.000 bidones"       color="#3B82F6"       icon="🎯" />
          <KpiCard label="Facturación objetivo"   value={$(3_990_000)}        color="#6BB87A"       icon="📊" />
          <KpiCard label="Punto de equilibrio"    value={`${PUNTO_EQUILIBRIO} bidones`} color="#F59E0B" icon="⚖️" />
          <KpiCard label="Costo de compra"        value={$(COSTO_COMPRA)}    color="#EF4444"       icon="🛒" />
          <KpiCard label="Margen unitario"        value={$(MARGEN_CONTRIB)}  color="#6BB87A"       icon="📈" />
          <KpiCard label="Costos fijos mensuales" value={$(CF_TOTAL)}        color="#8B5CF6"       icon="🏢" />
          <KpiCard label="Audiencia inicial"      value="Newsletter 0→5.000" color="#6B7280"       icon="📧" />
        </div>
      </div>

      {/* ── Modelo Económico ──────────────────────────────────────────── */}
      <Section title="Modelo Económico — Unitario por Bidon (5 L)">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "400px" }}>
            <TableHead headers={["Concepto", "Valor ($U)"]} />
            <tbody>
              {modeloEconomico.map((row, idx) => (
                <tr key={row.concepto} style={{
                  borderBottom: "1px solid #F3F4F6",
                  background: idx % 2 === 0 ? "#fff" : "#FAFAFA",
                }}>
                  <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", fontWeight: 600, color: "#444" }}>
                    <span style={{
                      display: "inline-block", width: "10px", height: "10px",
                      borderRadius: "50%", background: row.color,
                      marginRight: "0.5rem", verticalAlign: "middle",
                    }} />
                    {row.concepto}
                  </td>
                  <td style={{
                    padding: "0.85rem 1rem", fontSize: "0.85rem",
                    fontWeight: 700, color: row.color,
                  }}>
                    {row.valor}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Costos Fijos ─────────────────────────────────────────────── */}
      <Section title="Costos Fijos Mensuales">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "360px" }}>
            <TableHead headers={["Rubro", "Monto mensual ($U)"]} />
            <tbody>
              {costosFijos.map((row, idx) => (
                <TableRow key={row.rubro} idx={idx} cells={[row.rubro, $(row.monto)]} />
              ))}
              <TableRow
                idx={costosFijos.length}
                bold
                cells={["Total costos fijos", $(CF_TOTAL)]}
              />
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Plan Comercial ────────────────────────────────────────────── */}
      <Section title="Plan Comercial — Proyección 12 Meses">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "420px" }}>
            <TableHead headers={["Mes", "Bidones", "Facturación ($U)", "Acumulado ($U)"]} />
            <tbody>
              {planComercial.map((row, idx) => {
                const acumulado = planComercial
                  .slice(0, idx + 1)
                  .reduce((s, r) => s + r.facturacion, 0);
                const esBE = row.bidones >= PUNTO_EQUILIBRIO;
                return (
                  <tr key={row.mes} style={{
                    borderBottom: "1px solid #F3F4F6",
                    background: esBE
                      ? "rgba(107,184,122,0.06)"
                      : (idx % 2 === 0 ? "#fff" : "#FAFAFA"),
                  }}>
                    <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", fontWeight: 600, color: "#444" }}>
                      Mes {row.mes}
                      {esBE && (
                        <span style={{
                          marginLeft: "0.5rem", fontSize: "0.68rem", fontWeight: 700,
                          background: "#dcfce7", color: "#166534",
                          padding: "1px 6px", borderRadius: "999px",
                        }}>
                          ✓ rentable
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", color: "#444" }}>
                      {row.bidones.toLocaleString("es-UY")}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", fontWeight: 700, color: "#111" }}>
                      {$(row.facturacion)}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", color: "#6B7280" }}>
                      {$(acumulado)}
                    </td>
                  </tr>
                );
              })}
              {/* Fila totales */}
              <tr style={{ background: "#F9FAFB", borderTop: "2px solid #E5E7EB" }}>
                <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", fontWeight: 700, color: "#111" }}>
                  Total año 1
                </td>
                <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", fontWeight: 700, color: "#111" }}>
                  {bidonesAnuales.toLocaleString("es-UY")}
                </td>
                <td colSpan={2} style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", fontWeight: 700, color: BRAND.primary }}>
                  {$(facturacionAnual)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ margin: "0.75rem 0 0", fontSize: "0.75rem", color: "#9CA3AF" }}>
          * Las filas con badge <strong style={{ color: "#166534" }}>✓ rentable</strong> indican meses donde
          el volumen supera el punto de equilibrio de {PUNTO_EQUILIBRIO} bidones.
        </p>
      </Section>

      {/* ── Estrategia Comercial ───────────────────────────────────────── */}
      <Section title="Estrategia Comercial">
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "0.75rem",
        }}>
          {estrategias.map(est => (
            <div key={est.label} style={{
              border: "1px solid #E5E7EB", borderRadius: "10px",
              padding: "1rem 1.25rem",
              display: "flex", gap: "0.75rem", alignItems: "flex-start",
            }}>
              <span style={{ fontSize: "1.4rem", lineHeight: 1, flexShrink: 0 }}>{est.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#111", marginBottom: "0.25rem" }}>
                  {est.label}
                </div>
                <div style={{ fontSize: "0.78rem", color: "#6B7280", lineHeight: 1.5 }}>
                  {est.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

    </div>
  );
}
