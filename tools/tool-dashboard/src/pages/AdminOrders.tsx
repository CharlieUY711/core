import { useState, useMemo } from "react";
import { useAdminOrders } from "../hooks/useAdminOrders";
import { useOutletContext } from "react-router-dom";

export default function AdminOrders() {
  const { isAdmin } = useOutletContext<any>() || {};
  const { orders, loading, error, refetch } = useAdminOrders(200, isAdmin);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFrom,   setFilterFrom]   = useState("");
  const [filterTo,     setFilterTo]     = useState("");
  const [search,       setSearch]       = useState("");
  const [selected,     setSelected]     = useState<any>(null);

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (filterStatus !== "all" && o.payment_status !== filterStatus) return false;
      if (filterFrom && new Date(o.created_at) < new Date(filterFrom)) return false;
      if (filterTo   && new Date(o.created_at) > new Date(filterTo + "T23:59:59")) return false;
      if (search && !o.id.includes(search.toLowerCase())) return false;
      return true;
    });
  }, [orders, filterStatus, filterFrom, filterTo, search]);

  const totalRevenue = useMemo(() =>
    filtered.filter(o => o.payment_status === "paid")
      .reduce((s, o) => s + Number(o.total || 0), 0), [filtered]);

  if (loading) return <div style={{ padding: "2rem", color: "#888" }}>Cargando órdenes...</div>;
  if (error)   return <div style={{ padding: "1rem", background: "#fef2f2", borderRadius: "8px", color: "#dc2626" }}>Error: {error}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                </div>

      {/* Filtros */}
      <div style={{ background: "#fff", borderRadius: "12px", padding: "1rem 1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6B7280", marginBottom: "4px" }}>Estado</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: "0.5rem 0.75rem", border: "1px solid #E5E7EB", borderRadius: "6px", fontSize: "0.85rem", background: "#fff" }}>
            <option value="all">Todos</option>
            <option value="paid">Pagado</option>
            <option value="pending_payment">Pendiente</option>
            <option value="failed">Fallido</option>
            <option value="cancelled">Cancelado</option>
            <option value="refunded">Reembolsado</option>
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6B7280", marginBottom: "4px" }}>Desde</label>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
            style={{ padding: "0.5rem 0.75rem", border: "1px solid #E5E7EB", borderRadius: "6px", fontSize: "0.85rem" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6B7280", marginBottom: "4px" }}>Hasta</label>
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
            style={{ padding: "0.5rem 0.75rem", border: "1px solid #E5E7EB", borderRadius: "6px", fontSize: "0.85rem" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6B7280", marginBottom: "4px" }}>Buscar ID</label>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="abc12345..."
            style={{ padding: "0.5rem 0.75rem", border: "1px solid #E5E7EB", borderRadius: "6px", fontSize: "0.85rem", width: "160px" }} />
        </div>
        <button onClick={() => { setFilterStatus("all"); setFilterFrom(""); setFilterTo(""); setSearch(""); }}
          style={{ padding: "0.5rem 0.75rem", background: "transparent", border: "1px solid #E5E7EB", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", color: "#888" }}>
          Limpiar
        </button>
        <div style={{ marginLeft: "auto", background: "#f0fdf4", padding: "0.5rem 1rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 700, color: "#166534" }}>
          Revenue filtrado: $U {totalRevenue.toLocaleString("es-UY")}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: "#fff", borderRadius: "12px", overflow: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
          <thead>
            <tr style={{ background: "#F9FAFB", borderBottom: "2px solid #E5E7EB" }}>
              {["ID Orden", "Fecha", "Total", "Estado pago", "Items", "Origen", ""].map(h => (
                <th key={h} style={{ padding: "0.85rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o, idx) => (
              <tr key={o.id} style={{ borderBottom: "1px solid #F3F4F6", background: idx % 2 === 0 ? "#fff" : "#FAFAFA", cursor: "pointer" }}
                onClick={() => setSelected(o)}>
                <td style={{ padding: "0.85rem 1rem" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#111", fontFamily: "monospace" }}>
                    #{o.id?.substring(0, 8).toUpperCase()}
                  </div>
                </td>
                <td style={{ padding: "0.85rem 1rem", fontSize: "0.8rem", color: "#666" }}>
                  {new Date(o.created_at).toLocaleDateString("es-UY")}
                  <div style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>{new Date(o.created_at).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" })}</div>
                </td>
                <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "#111" }}>
                  {o.currency === "USD" ? "U$S" : "$U"} {Number(o.total || 0).toLocaleString("es-UY")}
                </td>
                <td style={{ padding: "0.85rem 1rem" }}>
                  <PaymentBadge status={o.payment_status} />
                </td>
                <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", color: "#444", fontWeight: 600 }}>{o.items_count}</td>
                <td style={{ padding: "0.85rem 1rem" }}>
                  <SourceBadge source={o.source} />
                </td>
                <td style={{ padding: "0.85rem 1rem" }}>
                  <button onClick={e => { e.stopPropagation(); setSelected(o); }}
                    style={{ padding: "4px 12px", background: "#FFF3EF", color: "#FF6835", border: "1px solid #FF6835", borderRadius: "6px", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}>
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: "4rem", textAlign: "center", color: "#9CA3AF" }}>Sin órdenes para los filtros seleccionados</div>
        )}
      </div>

      {/* Modal detalle */}
      {selected && (
        <div onClick={() => setSelected(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: "16px", padding: "2rem", maxWidth: "560px", width: "100%", maxHeight: "80vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Orden #{selected.id?.substring(0, 8).toUpperCase()}</h3>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#888" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[
                { label: "ID completo", value: selected.id, mono: true },
                { label: "Fecha", value: new Date(selected.created_at).toLocaleString("es-UY") },
                { label: "Total", value: `${selected.currency === "USD" ? "U$S" : "$U"} ${Number(selected.total || 0).toLocaleString("es-UY")}` },
                { label: "Moneda", value: selected.currency },
                { label: "Estado pago", value: selected.payment_status },
                { label: "Items", value: selected.items_count },
                { label: "Origen", value: selected.source || "oddy" },
                { label: "MP Payment ID", value: selected.mp_payment_id || "—", mono: true },
                { label: "PayPal Order ID", value: selected.paypal_order_id || "—", mono: true },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #F3F4F6" }}>
                  <span style={{ color: "#6B7280", fontSize: "0.85rem" }}>{row.label}</span>
                  <span style={{ fontWeight: 600, fontSize: "0.85rem", fontFamily: row.mono ? "monospace" : undefined, color: "#111", maxWidth: "260px", textAlign: "right", wordBreak: "break-all" }}>
                    {String(row.value)}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button onClick={() => setSelected(null)}
                style={{ padding: "0.6rem 1.25rem", background: "#f1f5f9", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>
                Cerrar
              </button>
              <a href={`/orden/${selected.id}`} target="_blank" rel="noopener noreferrer"
                style={{ padding: "0.6rem 1.25rem", background: "#FF6835", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", textDecoration: "none" }}>
                Ver en tienda →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    paid:            { bg: "#f0fdf4", color: "#166534", label: "✅ Pagado" },
    pending_payment: { bg: "#fffbeb", color: "#92400e", label: "⏳ Pendiente" },
    failed:          { bg: "#fef2f2", color: "#dc2626", label: "❌ Fallido" },
    cancelled:       { bg: "#f1f5f9", color: "#64748b", label: "🚫 Cancelado" },
    refunded:        { bg: "#f0f9ff", color: "#0369a1", label: "↩️ Reembolsado" },
  };
  const s = map[status] || { bg: "#f1f5f9", color: "#9CA3AF", label: status };
  return <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>;
}

function SourceBadge({ source }: { source: string }) {
  const map: Record<string, { label: string; color: string }> = {
    oddy:          { label: "🛍 ODDY",   color: "#FF6835" },
    mercadopago:   { label: "💳 MP",     color: "#009EE3" },
    paypal:        { label: "🅿️ PayPal", color: "#003087" },
    mercadolibre:  { label: "🟡 ML",     color: "#FFE600" },
  };
  const s = map[source] || { label: source || "oddy", color: "#888" };
  return <span style={{ fontSize: "0.78rem", fontWeight: 600, color: s.color }}>{s.label}</span>;
}



