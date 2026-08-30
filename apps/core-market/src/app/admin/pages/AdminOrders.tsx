/**
 * Pedidos.
 *
 * SE LLAMA PEDIDOS, NO ÓRDENES
 * "Orden" es la palabra de la base de datos —`orders`, `payment_status`— y ahí
 * se queda: renombrar la tabla sería romper todo lo que la referencia para
 * arreglar una etiqueta. Lo que se lee en pantalla es "Pedidos".
 *
 * LA PANTALLA ES LA DEL PANEL
 * La barra con los estados, el buscador, el rango de fechas y la tabla salen de
 * la definición. Acá había tres cajas de filtros con sus propias etiquetas, una
 * tabla dibujada a mano con un botón "Ver" por fila, y un modal.
 *
 * EL DETALLE SE ABRE EN LA FILA, NO EN UN MODAL
 * Un modal tapa la lista: para comparar dos pedidos hay que abrir, leer,
 * cerrar, abrir el otro. Abierto en la fila, el de al lado sigue a la vista.
 */
import { useState, useMemo, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useAdminOrders } from "../hooks/useAdminOrders";
import { useShop } from "../components/AdminLayout";
import { Pantalla, usePantalla } from "../components/Pantalla";
import { Tabla, Columna, Fila, Tono } from "../components/Tabla";

const NIVEL = "pedidos";

/**
 * Los estados de pago. Una sola lista: son las secciones de la barra Y las
 * opciones del selector del buscador, y de acá sale también el tono del chip.
 *
 * Antes el `<select>` de filtro y el `PaymentBadge` tenían cada uno su lista.
 * Agregar un estado era acordarse de dos lugares.
 */
const ESTADOS: { valor: string; label: string; tono: Tono }[] = [
  { valor: "all",             label: "Todos",       tono: "neutro"   },
  { valor: "paid",            label: "Pagado",      tono: "ok"       },
  { valor: "pending_payment", label: "Pendiente",   tono: "atencion" },
  { valor: "failed",          label: "Fallido",     tono: "error"    },
  { valor: "cancelled",       label: "Cancelado",   tono: "neutro"   },
  { valor: "refunded",        label: "Reembolsado", tono: "neutro"   },
];

const estadoDe = (v: string) => ESTADOS.find(e => e.valor === v);

/** De dónde vino el pedido. */
const ORIGENES: Record<string, string> = {
  oddy: "ODDY", mercadopago: "MercadoPago",
  paypal: "PayPal", mercadolibre: "MercadoLibre",
};

const plata = (moneda: string, monto: unknown) =>
  `${moneda === "USD" ? "U$S" : "$U"} ${Number(monto || 0).toLocaleString("es-UY")}`;

export default function AdminOrders() {
  const { isAdmin } = useOutletContext<any>() || {};
  const { orders, loading, error } = useAdminOrders(200, isAdmin);
  const p = usePantalla();
  const { tablas } = p;

  const [estado, setEstado] = useState("all");
  const [desde,  setDesde]  = useState("");
  const [hasta,  setHasta]  = useState("");
  const [busca,  setBusca]  = useState("");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return orders.filter(o => {
      if (estado !== "all" && o.payment_status !== estado) return false;
      if (desde && new Date(o.created_at) < new Date(desde)) return false;
      if (hasta && new Date(o.created_at) > new Date(hasta + "T23:59:59")) return false;
      if (q && !String(o.id).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [orders, estado, desde, hasta, busca]);

  const cobrado = useMemo(() =>
    filtrados.filter(o => o.payment_status === "paid")
      .reduce((s, o) => s + Number(o.total || 0), 0), [filtrados]);

  /*
   * Los contadores van a la barra de arriba, que es donde vive lo general.
   * Acá estaban en una caja verde adentro de los filtros, así que el número que
   * más importa quedaba escondido al costado de un formulario.
   *
   * Se limpian al salir: si quedaran, el módulo siguiente mostraría los
   * números de éste.
   */
  const { setTopStats } = useShop();
  useEffect(() => {
    setTopStats([
      { label: "Pedidos", value: filtrados.length, color: "#fff"    },
      { label: "Cobrado", value: `$U ${cobrado.toLocaleString("es-UY")}`, color: "#4ADE80" },
    ]);
    return () => { setTopStats([]); };
  }, [filtrados.length, cobrado, setTopStats]);

  /* ------------------------------------------------------------------
   * LA TABLA
   *
   * Se declara ANTES del `return`: la barra va arriba en el árbol, así que si
   * esto viviera adentro del JSX los botones no sabrían qué se puede hacer
   * hasta un render después.
   * ---------------------------------------------------------------- */
  const columnas: Columna[] = [
    {
      id: "numero", label: "Pedido", ancho: 110,
      ver: f => (
        <span style={{ fontWeight: 700, fontFamily: "monospace", color: "#111" }}>
          #{String(f.numero)}
        </span>
      ),
    },
    {
      id: "estado", label: "Estado",
      chip: (f): { tono: Tono; texto: string } | null => {
        const e = estadoDe(String(f.estado));
        /* Un estado que no está en la lista se muestra crudo, no se esconde:
           si el back agrega uno nuevo hay que verlo, no que desaparezca. */
        return { tono: e?.tono ?? "neutro", texto: (e?.label ?? String(f.estado)).toUpperCase() };
      },
    },
    { id: "origen", label: "Origen", ancho: 110 },
    { id: "items",  label: "Ítems",  numero: true, ancho: 60 },
    { id: "total",  label: "Total",  numero: true, ancho: 110 },
    { id: "creado", label: "Fecha",  rastro: true, ancho: 110 },
  ];

  const filas: Fila[] = filtrados.map(o => ({
    clave: String(o.id),
    numero: String(o.id ?? "").substring(0, 8).toUpperCase(),
    estado: o.payment_status,
    origen: ORIGENES[o.source] ?? (o.source || "ODDY"),
    items: o.items_count,
    total: plata(o.currency, o.total),
    creado: new Date(o.created_at).toLocaleString("es-UY",
      { day: "2-digit", month: "2-digit", year: "2-digit",
        hour: "2-digit", minute: "2-digit" }),
    orden: o,
  }));

  const nivel = tablas.nivel(NIVEL, {
    columnas, filas,
    nombreDe: f => `#${f.numero}`,
    /* Un pedido no se crea, no se edita y no se borra desde acá: lo escribe la
       tienda. Por eso la barra no trae ninguna de las cuatro — un botón apagado
       para siempre es ruido que igual hay que leer para descartarlo. */
    detalle: f => <Detalle orden={f.orden as Record<string, unknown>} />,
  });

  if (loading) {
    return <div style={{ padding: "3rem", textAlign: "center", color: "var(--gray-400)" }}>
      Cargando pedidos…
    </div>;
  }

  return (
    <Pantalla p={p}
      /* Los estados, declarados UNA vez: se dibujan como botones del menú y
         como selector adentro del buscador. */
      secciones={{
        valor: estado,
        opciones: ESTADOS.map(e => ({ valor: e.valor, label: e.label })),
        onCambio: setEstado,
      }}
      buscador={{ valor: busca, onCambio: setBusca,
        placeholder: "Buscar por número de pedido" }}
      rango={{ desde, hasta, onDesde: setDesde, onHasta: setHasta }}
      error={error}>

      {filas.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--gray-400)" }}>
          {orders.length === 0
            ? "Todavía no hay pedidos."
            : "Ningún pedido con estos filtros."}
        </div>
      ) : (
        <Tabla {...nivel} />
      )}
    </Pantalla>
  );
}

/** Lo que no entra en la fila. Se abre debajo, sin tapar la lista. */
function Detalle({ orden }: { orden: Record<string, unknown> }) {
  const filas: { label: string; valor: string; mono?: boolean }[] = [
    { label: "Número completo", valor: String(orden.id ?? "—"), mono: true },
    { label: "Fecha",  valor: new Date(String(orden.created_at)).toLocaleString("es-UY") },
    { label: "Total",  valor: plata(String(orden.currency), orden.total) },
    { label: "Moneda", valor: String(orden.currency ?? "—") },
    { label: "Ítems",  valor: String(orden.items_count ?? 0) },
    { label: "Origen", valor: ORIGENES[String(orden.source)] ?? String(orden.source || "ODDY") },
    /* Los identificadores del cobro: es lo que hay que copiar para reclamarle
       algo a la pasarela. Sin esto había que ir a buscarlos a otro lado. */
    { label: "MercadoPago", valor: String(orden.mp_payment_id ?? "—"), mono: true },
    { label: "PayPal",      valor: String(orden.paypal_order_id ?? "—"), mono: true },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem",
      maxWidth: 560 }}>
      {filas.map(f => (
        <div key={f.label} style={{ display: "flex", justifyContent: "space-between",
          gap: "1rem", padding: "0.3rem 0", borderBottom: "1px solid #F3F4F6" }}>
          <span style={{ color: "var(--mute)", fontSize: "0.78rem" }}>{f.label}</span>
          <span style={{ fontWeight: 600, fontSize: "0.78rem", color: "#111",
            fontFamily: f.mono ? "monospace" : undefined,
            textAlign: "right", wordBreak: "break-all" }}>
            {f.valor}
          </span>
        </div>
      ))}

      <a href={`/orden/${orden.id}`} target="_blank" rel="noopener noreferrer"
        style={{ alignSelf: "flex-start", marginTop: "0.5rem",
          fontSize: "0.78rem", fontWeight: 700, color: "var(--brand-madre)",
          textDecoration: "none" }}>
        Ver en la tienda →
      </a>
    </div>
  );
}
