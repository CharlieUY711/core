import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

export default function AdminML() {
  const [products, setProducts] = useState<any[]>([]);
  const [errors,   setErrors]   = useState<any[]>([]);
  const [queue,    setQueue]    = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState<string | null>(null);
  const [msg,      setMsg]      = useState<{ text: string; type: "ok" | "err" } | null>(null);

  const notify = (text: string, type: "ok" | "err") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [p, e, q] = await Promise.all([
      supabase.from("admin_products").select("*").not("ml_item_id", "is", null).order("ml_last_sync", { ascending: false }),
      supabase.from("admin_ml_errors").select("*"),
      supabase.from("ml_sync_queue").select("*").in("status", ["pending", "error"]).order("created_at", { ascending: false }).limit(20),
    ]);
    setProducts(p.data || []);
    setErrors(e.data || []);
    setQueue(q.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  const handleSyncStock = async (productId: string) => {
    setSaving(productId);
    try {
      const { error } = await supabase.rpc("admin_publish_ml", { p_product_id: productId });
      if (error) throw error;
      notify("Stock encolado para sync ✓", "ok");
      await load();
    } catch (err: any) {
      notify(err.message || "Error", "err");
    } finally { setSaving(null); }
  };

  const handleRetry = async (productId: string) => {
    setSaving(productId);
    try {
      await supabase.from("ml_sync_queue")
        .update({ status: "pending", retries: 0 })
        .eq("product_id", productId)
        .eq("status", "error");
      notify("Reintento encolado ✓", "ok");
      await load();
    } catch (err: any) {
      notify(err.message || "Error", "err");
    } finally { setSaving(null); }
  };

  if (loading) return <div style={{ padding: "2rem", color: "#888" }}>Cargando datos ML...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                </div>

      {msg && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600,
          background: msg.type === "ok" ? "#f0fdf4" : "#fef2f2",
          color: msg.type === "ok" ? "#166534" : "#dc2626",
          border: `1px solid ${msg.type === "ok" ? "#6BB87A" : "#ef4444"}` }}>
          {msg.text}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
        {[
          { label: "Publicados en ML", value: products.length,                               color: "#F59E0B" },
          { label: "Errores de sync",  value: errors.length,                                 color: "#EF4444" },
          { label: "Cola pendiente",   value: queue.filter(q => q.status === "pending").length, color: "#3B82F6" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem 1.5rem", borderLeft: `4px solid ${k.color}` }}>
            <div style={{ color: "#6B7280", fontSize: "0.75rem" }}>{k.label}</div>
            <div style={{ fontWeight: 800, fontSize: "1.75rem", color: "#111" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Productos publicados en ML */}
      <div style={{ background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #E5E7EB", fontWeight: 700, fontSize: "0.95rem" }}>
          Productos publicados ({products.length})
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
              {["Producto", "ML Item ID", "ML Status", "Stock", "Sync", "Último sync", "Acciones"].map(h => (
                <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.73rem", fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr><td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "#9CA3AF" }}>Sin productos publicados en ML</td></tr>
            )}
            {products.map((p, idx) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #F3F4F6", background: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                <td style={{ padding: "0.75rem 1rem", fontWeight: 600, fontSize: "0.875rem", color: "#111", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</td>
                <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace", fontSize: "0.78rem", color: "#6B7280" }}>{p.ml_item_id}</td>
                <td style={{ padding: "0.75rem 1rem" }}><MLStatusBadge status={p.ml_status} /></td>
                <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: p.stock === 0 ? "#EF4444" : "#111" }}>{p.stock}</td>
                <td style={{ padding: "0.75rem 1rem" }}><SyncBadge status={p.sync_status} /></td>
                <td style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", color: "#9CA3AF" }}>
                  {p.ml_last_sync ? new Date(p.ml_last_sync).toLocaleString("es-UY", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                </td>
                <td style={{ padding: "0.75rem 1rem" }}>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <ActionBtn label="Sync stock" color="#3B82F6" disabled={saving === p.id} onClick={() => handleSyncStock(p.id)} />
                    {p.sync_status === "error" && (
                      <ActionBtn label="Reintentar" color="#EF4444" disabled={saving === p.id} onClick={() => handleRetry(p.id)} />
                    )}
                    {saving === p.id && <span style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>⏳</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cola de sincronización */}
      {queue.length > 0 && (
        <div style={{ background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #E5E7EB", fontWeight: 700, fontSize: "0.95rem" }}>
            Cola de sync ({queue.length})
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                {["Producto ID", "Acción", "Estado", "Reintentos", "Creado"].map(h => (
                  <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.73rem", fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queue.map((q, idx) => (
                <tr key={q.id} style={{ borderBottom: "1px solid #F3F4F6", background: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                  <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace", fontSize: "0.78rem", color: "#6B7280" }}>{q.product_id?.substring(0, 12)}...</td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 600 }}>{q.action}</td>
                  <td style={{ padding: "0.75rem 1rem" }}><SyncBadge status={q.status} /></td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.85rem", color: q.retries >= 3 ? "#EF4444" : "#444", fontWeight: q.retries >= 3 ? 700 : 400 }}>{q.retries}</td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", color: "#9CA3AF" }}>{new Date(q.created_at).toLocaleString("es-UY", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Errores ML */}
      {errors.length > 0 && (
        <div style={{ background: "#fff", borderRadius: "12px", overflow: "hidden", borderLeft: "4px solid #EF4444" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #E5E7EB", fontWeight: 700, fontSize: "0.95rem", color: "#dc2626" }}>
            ❌ Errores de sincronización ({errors.length})
          </div>
          {errors.map(e => (
            <div key={e.product_id} style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #FEF2F2", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#111" }}>{e.product_name}</div>
                <div style={{ fontSize: "0.78rem", color: "#9CA3AF" }}>ML ID: {e.ml_item_id || "—"} · Retries: {e.retries} · {e.queue_action}</div>
              </div>
              <ActionBtn label="Reintentar" color="#EF4444" disabled={saving === e.product_id} onClick={() => handleRetry(e.product_id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MLStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    active:  { bg: "#f0fdf4", color: "#166534" },
    paused:  { bg: "#fffbeb", color: "#92400e" },
    closed:  { bg: "#fef2f2", color: "#dc2626" },
  };
  const s = map[status] || { bg: "#f1f5f9", color: "#9CA3AF" };
  return <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, background: s.bg, color: s.color }}>🟡 {status || "—"}</span>;
}

function SyncBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    synced:  { bg: "#f0fdf4", color: "#166534", label: "✓ Sync" },
    error:   { bg: "#fef2f2", color: "#dc2626", label: "✕ Error" },
    pending: { bg: "#fffbeb", color: "#92400e", label: "⏳ Pendiente" },
    done:    { bg: "#f0fdf4", color: "#166534", label: "✓ Done" },
  };
  const s = map[status] || { bg: "#f1f5f9", color: "#9CA3AF", label: status || "—" };
  return <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>;
}

function ActionBtn({ label, color, disabled, onClick }: { label: string; color: string; disabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: "4px 10px", background: "transparent", color, border: `1px solid ${color}`, borderRadius: "6px", cursor: disabled ? "not-allowed" : "pointer", fontSize: "0.75rem", fontWeight: 600, opacity: disabled ? 0.5 : 1 }}>
      {label}
    </button>
  );
}


