import { useState, useEffect } from "react";
import { supabase } from "../../../utils/supabase/client";
import { useAdminStats } from "../hooks/useAdminStats";
import { EstadoDeLaPlataforma } from "../components/EstadoDeLaPlataforma";

/**
 * El tablero de la sesión.
 *
 * Para una tienda: sus órdenes, su facturación, su stock.
 *
 * Para CORE Market, nada de eso existe —administra y no vende— así que en su
 * lugar va el estado de la plataforma. Sin menú propio: los lugares están en
 * el costado, y una barra acá sería una segunda navegación.
 *
 * Mostrarle "Órdenes totales: 0" sería peor que no mostrarle nada: sugiere que
 * debería tener órdenes.
 */
export default function AdminDashboard() {
  const [esPlataforma, setEsPlataforma] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.rpc("soy_la_plataforma").then(({ data, error }) => {
      setEsPlataforma(error ? false : data === true);
    });
  }, []);

  // Mientras no se sabe, no se dibuja ninguno de los dos: mostrar el de tienda
  // y cambiarlo un instante después es un parpadeo que confunde.
  if (esPlataforma === null) {
    return <div style={{ padding: "2rem", color: "#888" }}>Cargando…</div>;
  }
  // Sin barra: un Dashboard responde "¿cómo está esto?". Los lugares
  // —Tiendas, Territorios, Definiciones, Taxonomía— están en el menú.
  if (esPlataforma) return <EstadoDeLaPlataforma />;

  return <TableroDeTienda />;
}

function TableroDeTienda() {
  const { stats, loading } = useAdminStats();

  if (loading) return <div style={{ padding: "2rem", color: "#888" }}>Cargando estadísticas...</div>;

  const cards = [
    { label: "Órdenes totales",    value: stats?.total_orders || 0,      color: "#FF6835" },
    { label: "Órdenes pagadas",    value: stats?.paid_orders || 0,       color: "color-mix(in srgb, var(--color-success) 70%, white)" },
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


