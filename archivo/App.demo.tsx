import { useState } from "react";
import UserProfile from "./widgets/UserProfile";
import AddressGeoWidget, { Address } from "./widgets/AddressGeo";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;
const DEMO_USER = {
  userId:    "demo-001",
  userEmail: "demo@core.dev",
  userRole:  "admin",
};

type View = "perfil" | "geo";

export default function App() {
  const [view,      setView]      = useState<View>("perfil");
  const [addresses, setAddresses] = useState<Address[]>([]);

  const nav = (v: View): React.CSSProperties => ({
    padding:      "0.55rem 1.4rem",
    borderRadius: "8px",
    border:       "none",
    cursor:       "pointer",
    fontWeight:   view === v ? 700 : 400,
    fontSize:     "0.875rem",
    background:   view === v ? "#FF7A00" : "transparent",
    color:        view === v ? "#fff" : "#555",
    transition:   "all 0.15s",
  });

  const missingToken = !MAPBOX_TOKEN || MAPBOX_TOKEN === "TU_TOKEN_MAPBOX_AQUI";

  return (
    <div style={{ minHeight: "100vh", background: "#F5F5F7", fontFamily: "system-ui, sans-serif" }}>

      {/* Nav */}
      <header style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "0.75rem 2rem", display: "flex", alignItems: "center", gap: "1rem", position: "sticky", top: 0, zIndex: 50 }}>
        <span style={{ fontWeight: 800, fontSize: "1rem", color: "#111", marginRight: "1rem" }}>
          🧩 core-tools dev
        </span>
        <button style={nav("perfil")} onClick={() => setView("perfil")}>👤 UserProfile</button>
        <button style={nav("geo")}    onClick={() => setView("geo")}>📍 AddressGeo</button>
        <span style={{ marginLeft: "auto", padding: "4px 12px", background: missingToken ? "#FEF3C7" : "#D1FAE5", color: missingToken ? "#92400E" : "#065F46", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600 }}>
          {missingToken ? "⚠️ Falta VITE_MAPBOX_TOKEN en .env.local" : "✓ Mapbox conectado"}
        </span>
      </header>

      {/* Contenido */}
      <main style={{ padding: "2rem", maxWidth: "960px", margin: "0 auto" }}>

        {view === "perfil" && (
          <>
            <Header title="UserProfile widget" subtitle="Datos guardados en localStorage (userId: demo-001)" />
            <UserProfile
              {...DEMO_USER}
              accentColor="#FF7A00"
              AddressWidget={({ addresses: a, onChange, accentColor }) => (
                <AddressGeoWidget
                  mapboxToken={MAPBOX_TOKEN}
                  addresses={a}
                  onAddressesChange={onChange}
                  accentColor={accentColor}
                />
              )}
            />
          </>
        )}

        {view === "geo" && (
          <>
            <Header title="AddressGeo widget" subtitle="Módulo de dirección y geoposicionamiento standalone" />
            <div style={{ background: "#fff", borderRadius: "16px", padding: "2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <AddressGeoWidget
                mapboxToken={MAPBOX_TOKEN}
                addresses={addresses}
                onAddressesChange={setAddresses}
                accentColor="#FF7A00"
              />
            </div>
            {addresses.length > 0 && (
              <details style={{ marginTop: "1.5rem" }}>
                <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "0.875rem", color: "#6B7280", padding: "0.5rem 0" }}>
                  📋 Estado actual (JSON)
                </summary>
                <pre style={{ background: "#1E1E1E", color: "#D4D4D4", padding: "1.25rem", borderRadius: "10px", fontSize: "0.78rem", overflow: "auto", marginTop: "0.5rem" }}>
                  {JSON.stringify(addresses, null, 2)}
                </pre>
              </details>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#111" }}>{title}</h1>
      <p  style={{ margin: "4px 0 0", color: "#9CA3AF", fontSize: "0.875rem" }}>{subtitle}</p>
    </div>
  );
}
