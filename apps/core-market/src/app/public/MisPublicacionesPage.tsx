import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../utils/supabase/client";

/**
 * HUÉRFANO — no está en routes.tsx ni App.tsx (grep confirmado). "/dashboard"
 * redirige a "/admin" (ver DashboardRedirect.tsx); no existe ninguna ruta
 * "/mis-publicaciones". Es el mismo caso que CoreStorefront.tsx (DEC-004):
 * recomendado para borrar, no para seguir manteniendo.
 *
 * Se arregla igual para que no quede referenciando tablas caídas, pero el
 * modelo de fondo (un usuario cualquiera, identificado por `user_id`, publica
 * sus propios artículos second-hand) no tiene equivalente en catalog_*: ese
 * modelo es por tienda (`store_id` vía JWT, RLS), y el alta de tienda/
 * membresía es administrativa, no self-service
 * (20260822000000_store_membership_and_jwt_claim.sql). Si el usuario logueado
 * resulta ser miembro de una tienda, esto muestra sus publicaciones
 * second-hand vía `catalog_publicaciones` (la misma RPC que usa
 * AdminPublicaciones.tsx) — que es, en los hechos, lo mismo que ya se ve en
 * /admin/publicaciones filtrado a la pestaña Second Hand. Si no es miembro de
 * ninguna tienda, no hay nada que mostrar ni forma de publicar: no armo un
 * alta de tienda automática acá, es una decisión de producto pendiente
 * (ver .agent/TASK.md).
 */
export default function MisPublicacionesPage() {
  const navigate = useNavigate();
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sinTienda, setSinTienda] = useState(false);

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/?login=true&redirect=/mis-publicaciones"); return; }

      const { data, error } = await supabase.rpc("catalog_publicaciones", { p_currency: "UYU" });
      if (error) {
        // Sin claim store_id (usuario no es miembro de ninguna tienda) esto
        // devuelve cero filas por RLS, no un error — el error acá es otra
        // cosa (RPC caída, sesión inválida, etc).
        console.error("[mis-publicaciones]", error.message);
        setLoading(false);
        return;
      }

      const propias = (data || []).filter((p: any) => p.tipo === "secondhand");
      setSinTienda(propias.length === 0 && (data || []).length === 0);
      setProductos(propias);
      setLoading(false);
    }
    cargar();
  }, [navigate]);

  async function handleToggleStatus(id: string, currentStatus: string) {
    const nuevo = currentStatus === "active" ? "archived" : "active";
    const { error } = await supabase.rpc("actualizar_publicacion", { p_variant_id: id, p_status: nuevo });
    if (error) { alert("Error: " + error.message); return; }
    setProductos(p => p.map(x => x.variant_id === id ? { ...x, item_status: nuevo } : x));
  }

  async function handleEliminar(id: string) {
    if (!confirm("¿Archivar esta publicación? Deja de verse en la tienda pero no se borra.")) return;
    const { error } = await supabase.rpc("actualizar_publicacion", { p_variant_id: id, p_status: "archived" });
    if (error) { alert("Error: " + error.message); return; }
    setProductos(p => p.filter(x => x.variant_id !== id));
  }

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Cargando...</div>;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FAFAFA", fontFamily: "DM Sans, sans-serif" }}>
      <header style={{ background: "color-mix(in srgb, var(--color-success) 70%, white)", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/" style={{ textDecoration: "none", color: "#fff", fontWeight: 600 }}>← Volver</Link>
        <h1 style={{ margin: 0, color: "#fff", fontSize: "1.25rem", fontWeight: 700 }}>Mis publicaciones</h1>
        <Link to="/admin/biblioteca/articulo" style={{ padding: "0.5rem 1rem", background: "#fff", color: "color-mix(in srgb, var(--color-success) 70%, white)", borderRadius: "8px", fontWeight: 700, textDecoration: "none" }}>
          + Nueva publicación
        </Link>
      </header>

      <div style={{ maxWidth: "800px", margin: "2rem auto", padding: "0 1rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {sinTienda ? (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "3rem", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>♻️</div>
            <h2 style={{ color: "#444", margin: "0 0 0.5rem 0" }}>Todavía no podés publicar acá</h2>
            <p style={{ color: "#888", margin: 0 }}>
              Publicar requiere una tienda asociada a tu cuenta. Contactá al administrador.
            </p>
          </div>
        ) : productos.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "3rem", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>♻️</div>
            <h2 style={{ color: "#444", margin: "0 0 0.5rem 0" }}>No tenés publicaciones</h2>
            <p style={{ color: "#888", margin: 0 }}>Publicá lo que ya no usás</p>
          </div>
        ) : (
          productos.map(p => (
            <div key={p.variant_id} style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#222", marginBottom: "0.25rem" }}>{p.title}</div>
                <div style={{ fontSize: "0.85rem", color: "#888" }}>$U {Number(p.master_price ?? 0).toLocaleString("es-UY")}</div>
              </div>
              <div style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600, background: p.item_status === "active" ? "#f0fdf4" : "#f1f5f9", color: p.item_status === "active" ? "#166534" : "#64748b" }}>
                {p.item_status === "active" ? "Activo" : "Inactivo"}
              </div>
              <button onClick={() => handleToggleStatus(p.variant_id, p.item_status)} style={{ padding: "0.4rem 0.75rem", background: "transparent", border: "1.5px solid var(--border)", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", color: "#555" }}>
                {p.item_status === "active" ? "Pausar" : "Activar"}
              </button>
              <button onClick={() => handleEliminar(p.variant_id)} style={{ padding: "0.4rem 0.75rem", background: "transparent", border: "1.5px solid #ef4444", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", color: "#ef4444" }}>
                Archivar
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
