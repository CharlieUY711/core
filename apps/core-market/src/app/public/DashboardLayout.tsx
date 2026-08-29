import { useState, useEffect } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../utils/supabase/client";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      if (!user) { navigate("/?login=true&redirect=/dashboard"); return; }
      setUser(user);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const menu = [
    { path: "/dashboard/ordenes", label: "🛍 Mis órdenes" },
    { path: "/dashboard/publicaciones", label: "♻️ Mis publicaciones" },
    { path: "/dashboard/perfil", label: "👤 Mi perfil" },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FAFAFA", fontFamily: "DM Sans, sans-serif" }}>
      <header style={{ background: "#FF6835", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/" style={{ textDecoration: "none", color: "#fff", fontWeight: 600 }}>← Tienda</Link>
        <h1 style={{ margin: 0, color: "#fff", fontSize: "1.25rem", fontWeight: 700 }}>Mi cuenta</h1>
        <div style={{ color: "#fff", fontSize: "0.85rem", opacity: 0.8 }}>{user?.email}</div>
      </header>

      <div style={{ maxWidth: "1100px", margin: "2rem auto", padding: "0 1rem", display: "grid", gridTemplateColumns: "220px 1fr", gap: "2rem" }}>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {menu.map(item => (
            <Link key={item.path} to={item.path} style={{
              padding: "0.75rem 1rem", borderRadius: "8px", textDecoration: "none",
              fontWeight: isActive(item.path) ? 700 : 400,
              background: isActive(item.path) ? "#FF6835" : "#fff",
              color: isActive(item.path) ? "#fff" : "#444",
              border: "1px solid var(--border)",
              transition: "all 0.2s",
            }}>
              {item.label}
            </Link>
          ))}
          <button onClick={handleLogout} style={{
            marginTop: "1rem", padding: "0.75rem 1rem", borderRadius: "8px",
            background: "transparent", border: "1.5px solid #ef4444",
            color: "#ef4444", fontWeight: 600, cursor: "pointer", textAlign: "left",
          }}>
            🚪 Cerrar sesión
          </button>
        </div>

        {/* Contenido */}
        <div>
          <Outlet context={{ user }} />
        </div>
      </div>
    </div>
  );
}



