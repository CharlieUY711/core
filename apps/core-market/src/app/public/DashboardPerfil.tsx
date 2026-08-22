import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../../utils/supabase/client";

export default function DashboardPerfil() {
  const { user } = useOutletContext();
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (user?.user_metadata?.nombre) setNombre(user.user_metadata.nombre);
  }, [user]);

  const handleGuardar = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { nombre } });
    setSaving(false);
    setMensaje(error ? "Error guardando" : "¡Guardado!");
    setTimeout(() => setMensaje(""), 3000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#222" }}>Mi perfil</h2>
      <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#444", marginBottom: "0.25rem" }}>Email</label>
          <input value={user?.email || ""} disabled style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1.5px solid var(--border)", fontSize: "1rem", background: "#f9f9f9", color: "#888", boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#444", marginBottom: "0.25rem" }}>Nombre</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre completo"
            style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1.5px solid var(--border)", fontSize: "1rem", outline: "none", boxSizing: "border-box" }} />
        </div>
        {mensaje && <div style={{ color: mensaje.includes("Error") ? "#dc2626" : "#166534", fontWeight: 600 }}>{mensaje}</div>}
        <button onClick={handleGuardar} disabled={saving} style={{ padding: "0.75rem", background: saving ? "#ccc" : "#FF6835", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}



