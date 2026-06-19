import { useAdminStats } from "../hooks/useAdminStats";

export default function AdminDashboard() {
  const { stats, loading } = useAdminStats();

  if (loading) return <div style={{ padding: "2rem", color: "#888" }}>Cargando estadísticas...</div>;

  const cards = [
    { label: "Órdenes totales",    value: stats?.total_orders || 0,      color: "#FF6835" },
    { label: "Órdenes pagadas",    value: stats?.paid_orders || 0,       color: "#6BB87A" },
    { label: "Órdenes pendientes", value: stats?.pending_orders || 0,    color: "#F59E0B" },
    { label: "Revenue $U",         value: `$U ${Number(stats?.revenue_uyu || 0).toLocaleString("es-UY")}`, color: "#3B82F6" },
    { label: "Productos activos",  value: stats?.active_products || 0,   color: "#8B5CF6" },
    { label: "Sin stock",          value: stats?.out_of_stock || 0,      color: "#EF4444" },
    { label: "ML activos",         value: stats?.ml_active || 0,         color: "#F59E0B" },
    { label: "Errores ML sync",    value: stats?.ml_sync_errors || 0,    color: "#EF4444" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
        {cards.map(card => (
          <div key={card.label} style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem 1.5rem", borderLeft: `4px solid ${card.color}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ color: "#888", fontSize: "0.8rem", marginBottom: "0.25rem" }}>{card.label}</div>
            <div style={{ fontWeight: 800, fontSize: "1.5rem", color: "#222" }}>{card.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


