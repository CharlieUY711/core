import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../../utils/supabase/client";

/**
 * HUÉRFANO — no está en routes.tsx ni App.tsx (grep confirmado), y no hay
 * ningún layout con <Outlet context={{user}}> que lo monte. Casi idéntico a
 * MisPublicacionesPage.tsx (mismo caso, mismo llamado a revisar: DEC-004
 * recomendó borrar CoreStorefront.tsx por la misma razón — dos archivos
 * gemelos sin ruta es una señal más fuerte todavía de que conviene borrar uno
 * -o los dos- en vez de mantenerlos).
 *
 * Se arregla igual para sacar la dependencia de `productos_secondhand`
 * (tabla caída), pero ver el comentario largo en MisPublicacionesPage.tsx:
 * el modelo de "un usuario cualquiera publica sus cosas" no tiene lugar en
 * catalog_* (que es por tienda, con alta de membresía administrativa). Acá
 * se resuelve mostrando la vidriera second-hand de la tienda del usuario, si
 * tiene una — no se inventa una de alta automática.
 */
export default function DashboardPublicaciones() {
  const { user } = useOutletContext<{ user: { id: string } | null }>();
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sinTienda, setSinTienda] = useState(false);

  const cargar = async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc("catalog_publicaciones", { p_currency: "UYU" });
    if (error) { console.error("[dashboard-publicaciones]", error.message); setLoading(false); return; }
    const propias = (data || []).filter((p: any) => p.tipo === "secondhand");
    setSinTienda(propias.length === 0 && (data || []).length === 0);
    setProductos(propias);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [user]);

  const toggleStatus = async (id: string, current: string) => {
    const nuevo = current === "active" ? "archived" : "active";
    const { error } = await supabase.rpc("actualizar_publicacion", { p_variant_id: id, p_status: nuevo });
    if (error) { alert("Error: " + error.message); return; }
    await cargar();
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Archivar? Deja de verse en la tienda pero no se borra.")) return;
    const { error } = await supabase.rpc("actualizar_publicacion", { p_variant_id: id, p_status: "archived" });
    if (error) { alert("Error: " + error.message); return; }
    await cargar();
  };

  if (loading) return <div style={{ padding: "2rem", color: "#666" }}>Cargando...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#222" }}>Mis publicaciones</h2>
        <a href="/admin/biblioteca/articulo" style={{ padding: "0.5rem 1rem", background: "color-mix(in srgb, var(--color-success) 70%, white)", color: "#fff", borderRadius: "8px", fontWeight: 700, textDecoration: "none" }}>
          + Nueva
        </a>
      </div>

      {sinTienda ? (
        <div style={{ background: "#fff", borderRadius: "12px", padding: "3rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem" }}>♻️</div>
          <p style={{ color: "#888", margin: "0.5rem 0 0 0" }}>Publicar requiere una tienda asociada a tu cuenta.</p>
        </div>
      ) : productos.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: "12px", padding: "3rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem" }}>♻️</div>
          <p style={{ color: "#888", margin: "0.5rem 0 0 0" }}>No tenés publicaciones aún</p>
        </div>
      ) : productos.map((p) => (
        <div key={p.variant_id} style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "#222" }}>{p.title}</div>
            <div style={{ fontSize: "0.8rem", color: "#888" }}>$U {Number(p.master_price ?? 0).toLocaleString("es-UY")}</div>
          </div>
          <div style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600, background: p.item_status === "active" ? "#f0fdf4" : "#f1f5f9", color: p.item_status === "active" ? "#166534" : "#64748b" }}>
            {p.item_status === "active" ? "Activo" : "Inactivo"}
          </div>
          <button onClick={() => toggleStatus(p.variant_id, p.item_status)} style={{ padding: "0.4rem 0.75rem", background: "transparent", border: "1.5px solid var(--border)", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", color: "#555" }}>
            {p.item_status === "active" ? "Pausar" : "Activar"}
          </button>
          <button onClick={() => eliminar(p.variant_id)} style={{ padding: "0.4rem 0.75rem", background: "transparent", border: "1.5px solid #ef4444", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", color: "#ef4444" }}>
            Archivar
          </button>
        </div>
      ))}
    </div>
  );
}
