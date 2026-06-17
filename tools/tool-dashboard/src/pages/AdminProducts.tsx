import { useState } from "react";
import { useAdminProducts } from "../hooks/useAdminProducts";
import { supabase } from "../utils/supabase";

export default function AdminProducts() {
  const { products, loading, error, refetch, pauseProduct, fixStock } = useAdminProducts();
  const [editId, setEditId]       = useState<string | null>(null);
  const [editStock, setEditStock] = useState("");
  const [saving, setSaving]       = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleFixStock = async (id: string) => {
    setSaving(id);
    setActionError(null);
    try {
      await fixStock(id, Number(editStock));
      setEditId(null);
    } catch (err: any) {
      setActionError(err.message || "Error actualizando stock");
    } finally { setSaving(null); }
  };

  const handlePause = async (id: string) => {
    setSaving(id);
    setActionError(null);
    try {
      await pauseProduct(id);
    } catch (err: any) {
      setActionError(err.message || "Error pausando producto");
    } finally { setSaving(null); }
  };

  const handlePublishML = async (id: string) => {
    setSaving(id);
    setActionError(null);
    try {
      const { error } = await supabase.rpc("admin_publish_ml", { p_product_id: id });
      if (error) throw error;
      await refetch();
    } catch (err: any) {
      setActionError(err.message || "Error publicando en ML");
    } finally { setSaving(null); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem", color: "#888" }}>
      <div>Cargando productos...</div>
    </div>
  );

  if (error) return (
    <div style={{ background: "#fef2f2", border: "1px solid #ef4444", borderRadius: "8px", padding: "1rem", color: "#dc2626" }}>
      Error: {error}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                </div>

      {actionError && (
        <div style={{ background: "#fef2f2", border: "1px solid #ef4444", borderRadius: "8px", padding: "0.75rem 1rem", color: "#dc2626", fontSize: "0.85rem", display: "flex", justifyContent: "space-between" }}>
          ❌ {actionError}
          <button onClick={() => setActionError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontWeight: 700 }}>✕</button>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: "12px", overflow: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
          <thead>
            <tr style={{ background: "#F9FAFB", borderBottom: "2px solid #E5E7EB" }}>
              {["Producto", "Stock", "Precio", "Status", "ML Status", "Sync", "Acciones"].map(h => (
                <th key={h} style={{ padding: "0.85rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p, idx) => {
              const isSaving = saving === p.id;
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid #F3F4F6", background: idx % 2 === 0 ? "#fff" : "#FAFAFA", opacity: isSaving ? 0.6 : 1, transition: "opacity 0.2s" }}>

                  {/* Nombre */}
                  <td style={{ padding: "0.85rem 1rem" }}>
                    <div style={{ fontWeight: 600, color: "#111", fontSize: "0.9rem", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "#9CA3AF", fontFamily: "monospace" }}>{p.id.substring(0, 12)}...</div>
                  </td>

                  {/* Stock inline edit */}
                  <td style={{ padding: "0.85rem 1rem" }}>
                    {editId === p.id ? (
                      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                        <input type="number" value={editStock} onChange={e => setEditStock(e.target.value)} min="0"
                          style={{ width: "64px", padding: "4px 8px", border: "2px solid #FF6835", borderRadius: "6px", fontSize: "0.85rem", outline: "none" }}
                          onKeyDown={e => e.key === "Enter" && handleFixStock(p.id)} autoFocus />
                        <button onClick={() => handleFixStock(p.id)} disabled={isSaving}
                          style={{ padding: "4px 8px", background: "#6BB87A", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}>✓</button>
                        <button onClick={() => setEditId(null)}
                          style={{ padding: "4px 8px", background: "#f1f5f9", color: "#555", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontWeight: 800, fontSize: "1rem", color: p.stock === 0 ? "#EF4444" : p.stock <= 3 ? "#F59E0B" : "#111" }}>
                          {p.stock}
                        </span>
                        <button onClick={() => { setEditId(p.id); setEditStock(String(p.stock)); }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: "0.75rem" }} title="Editar stock">
                          ✏️
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Precio */}
                  <td style={{ padding: "0.85rem 1rem", fontSize: "0.875rem" }}>
                    <div style={{ fontWeight: 600, color: "#111" }}>
                      {p.price_ml ? `$U ${Number(p.price_ml).toLocaleString("es-UY")}` : p.price_oddy ? `$U ${Number(p.price_oddy).toLocaleString("es-UY")}` : "—"}
                    </div>
                    {p.price_ml && p.price_oddy && (
                      <div style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>Oddy: $U {Number(p.price_oddy).toLocaleString("es-UY")}</div>
                    )}
                  </td>

                  {/* Status */}
                  <td style={{ padding: "0.85rem 1rem" }}>
                    <StatusBadge status={p.status} />
                  </td>

                  {/* ML Status */}
                  <td style={{ padding: "0.85rem 1rem" }}>
                    {p.ml_item_id ? (
                      <div>
                        <StatusBadge status={p.ml_status || "unknown"} ml />
                        <div style={{ fontSize: "0.7rem", color: "#9CA3AF", marginTop: "2px", fontFamily: "monospace" }}>{p.ml_item_id.substring(0, 10)}</div>
                      </div>
                    ) : <span style={{ color: "#9CA3AF", fontSize: "0.8rem" }}>No publicado</span>}
                  </td>

                  {/* Sync */}
                  <td style={{ padding: "0.85rem 1rem" }}>
                    <SyncBadge status={p.sync_status} lastSync={p.ml_last_sync} />
                  </td>

                  {/* Acciones */}
                  <td style={{ padding: "0.85rem 1rem" }}>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      {p.status === "active" && (
                        <ActionBtn onClick={() => handlePause(p.id)} disabled={isSaving} color="#F59E0B" label="Pausar" />
                      )}
                      {p.status === "paused" && (
                        <ActionBtn onClick={async () => { setSaving(p.id); await supabase.rpc("admin_update_product", { p_product_id: p.id, p_status: "active" }); await refetch(); setSaving(null); }}
                          disabled={isSaving} color="#6BB87A" label="Activar" />
                      )}
                      {p.status === "active" && !p.ml_item_id && (
                        <ActionBtn onClick={() => handlePublishML(p.id)} disabled={isSaving} color="#F59E0B" label="→ ML" />
                      )}
                      {p.sync_status === "error" && (
                        <ActionBtn onClick={() => handlePublishML(p.id)} disabled={isSaving} color="#EF4444" label="Reintentar" />
                      )}
                      {isSaving && <span style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>⏳</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {products.length === 0 && (
          <div style={{ padding: "4rem", textAlign: "center", color: "#9CA3AF" }}>
            Sin productos
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status, ml }: { status: string; ml?: boolean }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    active:   { bg: "#f0fdf4", color: "#166534", label: "Activo" },
    paused:   { bg: "#fffbeb", color: "#92400e", label: "Pausado" },
    sold:     { bg: "#fef2f2", color: "#dc2626", label: "Vendido" },
    closed:   { bg: "#fef2f2", color: "#dc2626", label: "Cerrado" },
    unknown:  { bg: "#f1f5f9", color: "#64748b", label: "—" },
  };
  const s = map[status] || map.unknown;
  return (
    <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, background: s.bg, color: s.color, display: "inline-block" }}>
      {ml ? "🟡 " : ""}{s.label}
    </span>
  );
}

function SyncBadge({ status, lastSync }: { status: string; lastSync: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    synced:  { bg: "#f0fdf4", color: "#166534", label: "✓ Sync" },
    error:   { bg: "#fef2f2", color: "#dc2626", label: "✕ Error" },
    pending: { bg: "#fffbeb", color: "#92400e", label: "⏳ Pendiente" },
  };
  const s = map[status] || { bg: "#f1f5f9", color: "#9CA3AF", label: "—" };
  return (
    <div>
      <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, background: s.bg, color: s.color }}>
        {s.label}
      </span>
      {lastSync && (
        <div style={{ fontSize: "0.7rem", color: "#9CA3AF", marginTop: "2px" }}>
          {new Date(lastSync).toLocaleDateString("es-UY")}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ onClick, disabled, color, label }: { onClick: () => void; disabled: boolean; color: string; label: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: "4px 10px", background: "transparent", color, border: `1px solid ${color}`, borderRadius: "6px", cursor: disabled ? "not-allowed" : "pointer", fontSize: "0.75rem", fontWeight: 600, opacity: disabled ? 0.5 : 1, whiteSpace: "nowrap" }}>
      {label}
    </button>
  );
}


