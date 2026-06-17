import { useState, useEffect, useMemo } from "react";
import { supabase } from "../utils/supabase";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

export default function AdminAnalytics() {
  const [stats,   setStats]   = useState<any>(null);
  const [orders,  setOrders]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("admin_stats").select("*").single(),
      supabase.from("admin_orders").select("created_at, total, payment_status, currency, source")
        .order("created_at", { ascending: true }).limit(500),
    ]).then(([s, o]) => {
      setStats(s.data);
      setOrders(o.data || []);
      setLoading(false);
    });
  }, []);

  // Revenue por día (últimos 30 días)
  const revenueByDay = useMemo(() => {
    const map: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      map[d.toISOString().substring(0, 10)] = 0;
    }
    orders.filter(o => o.payment_status === "paid").forEach(o => {
      const day = o.created_at?.substring(0, 10);
      if (day && map[day] !== undefined) map[day] += Number(o.total || 0);
    });
    return Object.entries(map).map(([date, value]) => ({
      date: date.substring(5), value: Math.round(value),
    }));
  }, [orders]);

  // Órdenes por día
  const ordersByDay = useMemo(() => {
    const map: Record<string, { total: number; paid: number }> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      map[d.toISOString().substring(0, 10)] = { total: 0, paid: 0 };
    }
    orders.forEach(o => {
      const day = o.created_at?.substring(0, 10);
      if (day && map[day] !== undefined) {
        map[day].total++;
        if (o.payment_status === "paid") map[day].paid++;
      }
    });
    return Object.entries(map).map(([date, v]) => ({ date: date.substring(5), ...v }));
  }, [orders]);

  // Por origen
  const bySource = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => { const s = o.source || "oddy"; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [orders]);

  // Conversión (paid / total)
  const conversion = useMemo(() => {
    if (!orders.length) return 0;
    return Math.round((orders.filter(o => o.payment_status === "paid").length / orders.length) * 100);
  }, [orders]);

  const COLORS = ["#FF6835", "#6BB87A", "#3B82F6", "#F59E0B"];

  if (loading) return <div style={{ padding: "2rem", color: "#888" }}>Cargando analytics...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
        {[
          { label: "Revenue total $U", value: `$U ${Number(stats?.revenue_uyu || 0).toLocaleString("es-UY")}`, color: "#FF6835", icon: "💰" },
          { label: "Órdenes pagadas",  value: stats?.paid_orders || 0,    color: "#6BB87A", icon: "✅" },
          { label: "Tasa conversión",  value: `${conversion}%`,           color: "#3B82F6", icon: "📊" },
          { label: "Órdenes totales",  value: stats?.total_orders || 0,   color: "#8B5CF6", icon: "🛍" },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem 1.5rem", borderTop: `4px solid ${kpi.color}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>{kpi.icon}</div>
            <div style={{ color: "#6B7280", fontSize: "0.75rem", marginBottom: "0.25rem" }}>{kpi.label}</div>
            <div style={{ fontWeight: 800, fontSize: "1.4rem", color: "#111" }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Revenue por día */}
      <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <h3 style={{ margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 700, color: "#444" }}>Revenue últimos 30 días ($U)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={revenueByDay} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} interval={4} />
            <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false}
              tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <Tooltip
              contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "0.85rem" }}
              formatter={(v: any) => [`$U ${Number(v).toLocaleString("es-UY")}`, "Revenue"]} />
            <Line type="monotone" dataKey="value" stroke="#FF6835" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Órdenes por día + Origen */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <h3 style={{ margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 700, color: "#444" }}>Órdenes por día</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ordersByDay} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "0.8rem" }} />
              <Bar dataKey="total"  name="Total"   fill="#E5E7EB" radius={[3,3,0,0]} />
              <Bar dataKey="paid"   name="Pagadas" fill="#6BB87A" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <h3 style={{ margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 700, color: "#444" }}>Por origen</h3>
          {bySource.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={bySource} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" nameKey="name" paddingAngle={3}>
                  {bySource.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "8px", border: "none", fontSize: "0.8rem" }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: "0.78rem" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: "2rem", textAlign: "center", color: "#9CA3AF", fontSize: "0.85rem" }}>Sin datos</div>
          )}
        </div>
      </div>

      {/* Stats secundarios */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
        {[
          { label: "Revenue USD", value: `U$S ${Number(stats?.revenue_usd || 0).toLocaleString("es-UY")}`, color: "#3B82F6" },
          { label: "Productos sin stock", value: stats?.out_of_stock || 0, color: "#EF4444" },
          { label: "Productos SH activos", value: stats?.sh_active_products || 0, color: "#6BB87A" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem 1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ color: "#6B7280", fontSize: "0.75rem", marginBottom: "0.25rem" }}>{s.label}</div>
            <div style={{ fontWeight: 800, fontSize: "1.5rem", color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


