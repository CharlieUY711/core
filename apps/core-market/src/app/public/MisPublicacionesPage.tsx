import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../utils/supabase/client";

export default function MisPublicacionesPage() {
  const navigate = useNavigate();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: "", descripcion: "", precio: "", precio_original: "",
    imagen_principal: "", condicion: "Bueno", departamento_nombre: ""
  });

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/?login=true&redirect=/mis-publicaciones"); return; }
      setUser(user);
      await cargarProductos(user.id);
      setLoading(false);
    }
    cargar();
  }, []);

  async function cargarProductos(userId) {
    const { data } = await supabase
      .from("productos_secondhand")
      .select("id, nombre, precio, status, condicion, imagen_principal, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setProductos(data || []);
  }

  async function handlePublicar() {
    if (!form.nombre || !form.precio) { alert("Completá nombre y precio"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("productos_secondhand").insert({
        nombre: form.nombre,
        descripcion: form.descripcion,
        precio: Number(form.precio),
        precio_original: form.precio_original ? Number(form.precio_original) : null,
        imagen_principal: form.imagen_principal,
        condicion: form.condicion,
        departamento_nombre: form.departamento_nombre,
        user_id: user.id,
        status: "active",
        estado: "activo",
      });
      if (error) throw error;
      setShowForm(false);
      setForm({ nombre: "", descripcion: "", precio: "", precio_original: "", imagen_principal: "", condicion: "Bueno", departamento_nombre: "" });
      await cargarProductos(user.id);
    } catch (err) {
      alert("Error publicando: " + err.message);
    } finally { setSaving(false); }
  }

  async function handleToggleStatus(id, currentStatus) {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    await supabase.from("productos_secondhand").update({ status: newStatus }).eq("id", id);
    await cargarProductos(user.id);
  }

  async function handleEliminar(id) {
    if (!confirm("¿Eliminar esta publicación?")) return;
    await supabase.from("productos_secondhand").delete().eq("id", id);
    await cargarProductos(user.id);
  }

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Cargando...</div>;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FAFAFA", fontFamily: "DM Sans, sans-serif" }}>
      <header style={{ background: "color-mix(in srgb, var(--color-success) 70%, white)", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/" style={{ textDecoration: "none", color: "#fff", fontWeight: 600 }}>← Volver</Link>
        <h1 style={{ margin: 0, color: "#fff", fontSize: "1.25rem", fontWeight: 700 }}>Mis publicaciones</h1>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: "0.5rem 1rem", background: "#fff", color: "color-mix(in srgb, var(--color-success) 70%, white)", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}>
          {showForm ? "Cancelar" : "+ Nueva publicación"}
        </button>
      </header>

      <div style={{ maxWidth: "800px", margin: "2rem auto", padding: "0 1rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Formulario nueva publicación */}
        {showForm && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem" }}>
            <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", fontWeight: 700 }}>Nueva publicación</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[
                { label: "Nombre *", key: "nombre", type: "text", placeholder: "iPhone 13 Pro" },
                { label: "Descripción", key: "descripcion", type: "text", placeholder: "Estado, accesorios incluidos..." },
                { label: "Precio ($U) *", key: "precio", type: "number", placeholder: "25000" },
                { label: "Precio original ($U)", key: "precio_original", type: "number", placeholder: "45000" },
                { label: "URL imagen principal", key: "imagen_principal", type: "text", placeholder: "https://..." },
                { label: "Categoría", key: "departamento_nombre", type: "text", placeholder: "Celulares" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#444", marginBottom: "0.25rem" }}>{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder}
                    style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1.5px solid var(--border)", fontSize: "1rem", outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#444", marginBottom: "0.25rem" }}>Condición</label>
                <select value={form.condicion} onChange={e => setForm(prev => ({ ...prev, condicion: e.target.value }))}
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1.5px solid var(--border)", fontSize: "1rem", outline: "none" }}>
                  {["Excelente", "Muy bueno", "Bueno", "Regular", "Aceptable"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <button onClick={handlePublicar} disabled={saving} style={{ padding: "0.75rem", background: saving ? "#ccc" : "color-mix(in srgb, var(--color-success) 70%, white)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "1rem", cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Publicando..." : "Publicar"}
              </button>
            </div>
          </div>
        )}

        {/* Lista de publicaciones */}
        {productos.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "3rem", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>♻️</div>
            <h2 style={{ color: "#444", margin: "0 0 0.5rem 0" }}>No tenés publicaciones</h2>
            <p style={{ color: "#888", margin: 0 }}>Publicá lo que ya no usás</p>
          </div>
        ) : (
          productos.map(p => (
            <div key={p.id} style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              {p.imagen_principal && <img src={p.imagen_principal} alt={p.nombre} style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px" }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#222", marginBottom: "0.25rem" }}>{p.nombre}</div>
                <div style={{ fontSize: "0.85rem", color: "#888" }}>{p.condicion} · $U {Number(p.precio).toLocaleString("es-UY")}</div>
              </div>
              <div style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600, background: p.status === "active" ? "#f0fdf4" : "#f1f5f9", color: p.status === "active" ? "#166534" : "#64748b" }}>
                {p.status === "active" ? "Activo" : "Inactivo"}
              </div>
              <button onClick={() => handleToggleStatus(p.id, p.status)} style={{ padding: "0.4rem 0.75rem", background: "transparent", border: "1.5px solid var(--border)", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", color: "#555" }}>
                {p.status === "active" ? "Pausar" : "Activar"}
              </button>
              <button onClick={() => handleEliminar(p.id)} style={{ padding: "0.4rem 0.75rem", background: "transparent", border: "1.5px solid #ef4444", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", color: "#ef4444" }}>
                Eliminar
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}



