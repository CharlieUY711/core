import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../../utils/supabase/client";

export default function DashboardPublicaciones() {
  const { user } = useOutletContext();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: "", descripcion: "", precio: "", precio_original: "", imagen_principal: "", condicion: "Bueno", departamento_nombre: "" });

  const cargar = async () => {
    if (!user) return;
    const { data } = await supabase.from("productos_secondhand").select("id, nombre, precio, status, condicion, imagen_principal, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
    setProductos(data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [user]);

  const handlePublicar = async () => {
    if (!form.nombre || !form.precio) { alert("Completá nombre y precio"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("productos_secondhand").insert({
        nombre: form.nombre, descripcion: form.descripcion,
        precio: Number(form.precio), precio_original: form.precio_original ? Number(form.precio_original) : null,
        imagen_principal: form.imagen_principal, condicion: form.condicion,
        departamento_nombre: form.departamento_nombre,
        user_id: user.id, status: "active", estado: "activo",
      });
      if (error) throw error;
      setShowForm(false);
      setForm({ nombre: "", descripcion: "", precio: "", precio_original: "", imagen_principal: "", condicion: "Bueno", departamento_nombre: "" });
      await cargar();
    } catch (err) { alert("Error: " + err.message); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (id, current) => {
    await supabase.from("productos_secondhand").update({ status: current === "active" ? "inactive" : "active" }).eq("id", id);
    await cargar();
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar?")) return;
    await supabase.from("productos_secondhand").delete().eq("id", id);
    await cargar();
  };

  if (loading) return <div style={{ padding: "2rem", color: "#666" }}>Cargando...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#222" }}>Mis publicaciones</h2>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: "0.5rem 1rem", background: "color-mix(in srgb, var(--color-success) 70%, white)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}>
          {showForm ? "Cancelar" : "+ Nueva"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              { label: "Nombre *", key: "nombre", type: "text", placeholder: "iPhone 13 Pro" },
              { label: "Descripción", key: "descripcion", type: "text", placeholder: "Estado, accesorios..." },
              { label: "Precio ($U) *", key: "precio", type: "number", placeholder: "25000" },
              { label: "Precio original ($U)", key: "precio_original", type: "number", placeholder: "45000" },
              { label: "URL imagen", key: "imagen_principal", type: "text", placeholder: "https://..." },
              { label: "Categoría", key: "departamento_nombre", type: "text", placeholder: "Celulares" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#444", marginBottom: "0.25rem" }}>{f.label}</label>
                <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1.5px solid var(--border)", fontSize: "1rem", outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#444", marginBottom: "0.25rem" }}>Condición</label>
              <select value={form.condicion} onChange={e => setForm(p => ({ ...p, condicion: e.target.value }))}
                style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1.5px solid var(--border)", fontSize: "1rem" }}>
                {["Excelente", "Muy bueno", "Bueno", "Regular", "Aceptable"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={handlePublicar} disabled={saving} style={{ padding: "0.75rem", background: saving ? "#ccc" : "color-mix(in srgb, var(--color-success) 70%, white)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Publicando..." : "Publicar"}
            </button>
          </div>
        </div>
      )}

      {productos.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: "12px", padding: "3rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem" }}>♻️</div>
          <p style={{ color: "#888", margin: "0.5rem 0 0 0" }}>No tenés publicaciones aún</p>
        </div>
      ) : productos.map(p => (
        <div key={p.id} style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          {p.imagen_principal && <img src={p.imagen_principal} alt={p.nombre} style={{ width: "56px", height: "56px", objectFit: "cover", borderRadius: "8px" }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "#222" }}>{p.nombre}</div>
            <div style={{ fontSize: "0.8rem", color: "#888" }}>{p.condicion} · $U {Number(p.precio).toLocaleString("es-UY")}</div>
          </div>
          <div style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600, background: p.status === "active" ? "#f0fdf4" : "#f1f5f9", color: p.status === "active" ? "#166534" : "#64748b" }}>
            {p.status === "active" ? "Activo" : "Inactivo"}
          </div>
          <button onClick={() => toggleStatus(p.id, p.status)} style={{ padding: "0.4rem 0.75rem", background: "transparent", border: "1.5px solid var(--border)", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", color: "#555" }}>
            {p.status === "active" ? "Pausar" : "Activar"}
          </button>
          <button onClick={() => eliminar(p.id)} style={{ padding: "0.4rem 0.75rem", background: "transparent", border: "1.5px solid #ef4444", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", color: "#ef4444" }}>
            Eliminar
          </button>
        </div>
      ))}
    </div>
  );
}



