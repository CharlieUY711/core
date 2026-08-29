import { useEffect, useRef, useState, createContext, useContext } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../../utils/supabase/client";
import { useUserRole } from "../hooks/useUserRole";
import { BRAND } from "../../components/brand/Brand";

// ─── Contexto ────────────────────────────────────────────────────────────────
interface ShopCtx {
  isSH: boolean; setIsSH: (v: boolean) => void;
  topStats: { label: string; value: number | string; color: string }[];
  setTopStats: (s: { label: string; value: number | string; color: string }[]) => void;
  /**
   * Que se esta viendo dentro del modulo.
   *
   * La ruta alcanza para decir "Mis publicaciones", pero no distingue la lista
   * de la ficha de un articulo, ni si ese articulo es de Market o de Second
   * Hand: son la misma URL. Eso lo sabe la pantalla, asi que lo declara ella y
   * el encabezado lo muestra al lado del modulo.
   *
   * Vacio = no hay nada que aclarar y el encabezado queda como estaba.
   */
  vista: string;
  setVista: (v: string) => void;
}
export const ShopContext = createContext<ShopCtx>({
  isSH: false, setIsSH: () => {}, topStats: [], setTopStats: () => {},
  vista: "", setVista: () => {},
});
export const useShop = () => useContext(ShopContext);

// ─── Menú ─────────────────────────────────────────────────────────────────────
const commonMenu = [
  { path: "/admin",               label: "Dashboard",         exact: true },
  { path: "/admin/orders",        label: "Mis órdenes"                    },
  { path: "/admin/publicaciones", label: "Mis publicaciones"              },
  { path: "/admin/biblioteca",    label: "Biblioteca"                     },
  { path: "/admin/editor",      label: "Editor"                         },
  { path: "/admin/tool-editor", label: "Editor Pro"                     },
  /*
   * Importar y Exportar salieron de acá: son operaciones SOBRE la Biblioteca,
   * no lugares a los que se va. Tenerlas sueltas obligaba a saber de antemano
   * que existían y sobre qué actuaban; adentro de la Biblioteca están donde
   * está lo que importan y exportan.
   *
   * Carga Masiva desaparece. Lo que hacía —dar de alta muchos productos de una
   * vez— lo resuelve el catálogo por marca, que además sabe de dónde salen los
   * productos en vez de pedir un archivo armado a mano.
   */
  { path: "/admin/profile",       label: "Mi perfil"                      },
];

const adminSections = [
  {
    key: "gestion",
    section: "Gestión",
    items: [
      /* Catálogo salió de acá: departamentos y categorías son la estructura
         con la que se clasifica lo que hay en la Biblioteca, así que viven
         adentro de ella. Suelto en el menú era una pantalla que nadie sabía
         para qué servía. */
      { path: "/admin/analytics", label: "Analytics" },
    ],
  },
  {
    key: "integraciones",
    section: "Integraciones",
    items: [
      { path: "/admin/ml",        label: "ML & MercadoPago" },
      { path: "/admin/api-vault", label: "API Vault"        },
    ],
  },
];

// ─── Nombre de app desde BRAND ───────────────────────────────────────────────
function useAppName() {
  return BRAND.name;
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function UserAvatar({ user, isAdmin }: { user: any; isAdmin: boolean }) {
  const [avatar, setAvatar] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`avatar_${user?.id}`);
    if (saved) setAvatar(saved);
  }, [user]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setAvatar(dataUrl);
      localStorage.setItem(`avatar_${user?.id}`, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.08)",
      display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div onClick={() => inputRef.current?.click()} style={{
          width: "40px", height: "40px", borderRadius: "50%", cursor: "pointer",
          overflow: "hidden", border: `2px solid ${isAdmin ? BRAND.primary : BRAND.accent}`,
          background: "rgba(255,255,255,0.1)", display: "flex",
          alignItems: "center", justifyContent: "center" }}>
          {avatar
            ? <img src={avatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: "1.1rem" }}>{isAdmin ? "👑" : "👤"}</span>}
        </div>
        <div onClick={() => inputRef.current?.click()} style={{
          position: "absolute", bottom: "-2px", right: "-2px", width: "16px", height: "16px",
          borderRadius: "50%", background: BRAND.primary, display: "flex",
          alignItems: "center", justifyContent: "center", cursor: "pointer",
          fontSize: "0.55rem", border: `2px solid ${BRAND.secondary}` }}>✏️</div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.78rem", fontWeight: 600,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "130px" }}>
          {user?.user_metadata?.nombre || user?.email?.split("@")[0] || "Usuario"}
        </div>
        <div style={{ color: isAdmin ? BRAND.primary : BRAND.accent,
          fontSize: "0.65rem", fontWeight: 700, marginTop: "2px" }}>
          {isAdmin ? "Administrador" : "Usuario"}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ user, isAdmin, location }: { user: any; isAdmin: boolean; location: any }) {
  const appName = useAppName();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  const toggleSection = (key: string) =>
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const linkStyle = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center",
    padding: "0.5rem 1.5rem", textDecoration: "none", fontSize: "0.84rem",
    background: active ? `rgba(${hexToRgb(BRAND.primary)},0.15)` : "transparent",
    color: active ? BRAND.primary : "rgba(255,255,255,0.62)",
    borderLeft: active ? `3px solid ${BRAND.primary}` : "3px solid transparent",
    fontWeight: active ? 600 : 400, transition: "all 0.12s",
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <aside style={{ width: "220px", background: BRAND.secondary, display: "flex",
      flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>

      <div style={{ padding: "1.1rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.02em",
          lineHeight: 1, color: "#fff" }}>
          {appName || BRAND.name}
        </div>
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.62rem", marginTop: "3px" }}>
          Admin Panel
        </div>
      </div>

      <UserAvatar user={user} isAdmin={isAdmin} />

      <nav style={{ flex: 1, overflowY: "auto", padding: "0.5rem 0" }}>

        {commonMenu.map(item => {
          const active = isActive(item.path, item.exact);
          return (
            <Link key={item.path} to={item.path} style={linkStyle(active)}>
              {item.label}
            </Link>
          );
        })}

        {isAdmin && adminSections.map(({ key, section, items }) => {
          const isCollapsed = collapsed[key] ?? false;
          return (
            <div key={key}>
              <button onClick={() => toggleSection(key)} style={{
                width: "100%", display: "flex", alignItems: "center",
                justifyContent: "space-between",
                padding: "0.65rem 1.5rem 0.25rem", background: "transparent", border: "none",
                cursor: "pointer", fontSize: "0.62rem", color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700,
              }}>
                <span>{section}</span>
                <span style={{ fontSize: "0.7rem",
                  transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                  transition: "transform 0.2s", opacity: 0.5 }}>▾</span>
              </button>

              {!isCollapsed && items.map(item => {
                const active = isActive(item.path);
                return (
                  <div key={item.path}>
                    <Link to={item.path} style={linkStyle(active)}>
                      {item.label}
                    </Link>
                    {active && (item as {children?:{path:string;label:string}[]}).children?.map((child: any) => (
                        <Link key={child.path} to={child.path} style={{
                          display: "flex", alignItems: "center",
                          padding: "0.4rem 1.5rem 0.4rem 2.8rem",
                          textDecoration: "none", fontSize: "0.78rem",
                          color: isActive(child.path) ? BRAND.primary : "rgba(255,255,255,0.4)",
                          fontWeight: isActive(child.path) ? 600 : 400,
                        }}>
                          {child.label}
                        </Link>
                      ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <button onClick={handleLogout} style={{
          width: "100%", padding: "0.45rem", background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px",
          color: "rgba(255,255,255,0.5)", fontSize: "0.78rem", cursor: "pointer",
        }}>Cerrar sesión</button>
      </div>
    </aside>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({ location, vista }: { location: any; vista: string }) {
  const allItems = [...commonMenu, ...adminSections.flatMap(s => s.items)];

  const activeSection = adminSections.find(s =>
    s.items.some(i => location.pathname.startsWith(i.path))
  );
  const activeItem = allItems.find(m =>
    (m as any).exact ? location.pathname === m.path : location.pathname.startsWith(m.path)
  );

  const sectionLabel = activeSection?.section ?? null;
  const moduleLabel  = activeItem?.label ?? "Dashboard";

  return (
    <header style={{
      background: BRAND.secondary, height: "52px", padding: "0 1.5rem",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      position: "sticky", top: 0, zIndex: 10,
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem",
        fontSize: "0.88rem", color: "rgba(255,255,255,0.9)" }}>
        {sectionLabel && (
          <>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.82rem" }}>{sectionLabel}</span>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.75rem" }}>›</span>
          </>
        )}
        <span style={{ fontWeight: 600 }}>{moduleLabel}</span>
        {/* Lo que la ruta no puede decir: si se esta viendo la lista o la
            ficha de un articulo, y de que tipo. */}
        {vista && (
          <>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.75rem" }}>·</span>
            <span style={{ color: "rgba(255,255,255,0.75)", fontWeight: 400 }}>{vista}</span>
          </>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button onClick={() => window.location.reload()} title="Regenerar" style={{
          background: "transparent", border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: "6px", color: "rgba(255,255,255,0.6)", cursor: "pointer",
          fontSize: "1.1rem", width: "34px", height: "34px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>↻</button>
        <Link to="/" style={{
          color: BRAND.primary, textDecoration: "none", fontSize: "0.78rem", fontWeight: 700,
          padding: "0.35rem 0.9rem", border: `1.5px solid ${BRAND.primary}`,
          borderRadius: "6px",
        }}>Ver tienda</Link>
      </div>
    </header>
  );
}

// ─── Layout principal ─────────────────────────────────────────────────────────
export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, loading, error } = useUserRole();
  const [isSH, setIsSH] = useState(false);
  const [topStats, setTopStats] = useState<{ label: string; value: number | string; color: string }[]>([]);
  const [vista, setVista] = useState("");

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: BRAND.secondary }}>
      <div style={{ color: BRAND.primary, fontSize: "1rem" }}>Cargando...</div>
    </div>
  );

  /*
   * La sesión falló: se dice, y se ofrece la salida.
   *
   * Antes esto caía en el `navigate("/")` de abajo, así que el panel te sacaba
   * a la tienda sin explicar nada — o, si la promesa nunca resolvía, te dejaba
   * mirando "Cargando…" hasta que recargaras. Las dos cosas se ven como que la
   * aplicación se rompió, cuando lo único que pasó es que hay que volver a
   * entrar.
   */
  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: "0.9rem",
      background: BRAND.secondary, padding: "2rem", textAlign: "center" }}>
      <div style={{ color: BRAND.primary, fontSize: "1rem", fontWeight: 700 }}>
        Tu sesión no está disponible
      </div>
      <div style={{ color: "rgba(255,255,255,.65)", fontSize: "0.85rem", maxWidth: 420 }}>
        {error}
      </div>
      <Link to="/" style={{
        color: BRAND.secondary, background: BRAND.primary, textDecoration: "none",
        fontSize: "0.85rem", fontWeight: 700, padding: "0.55rem 1.2rem", borderRadius: 8,
      }}>Volver a la tienda e iniciar sesión</Link>
    </div>
  );

  if (!user) { navigate("/"); return null; }

  return (
    /*
      `height` y no `minHeight`.
   
      Con minHeight el shell podia crecer mas alto que la ventana, y entonces
      el que scrolleaba era el documento entero: se iban de pantalla la barra
      superior, la de acciones y el encabezado de la tabla, que son justamente
      lo que tiene que quedarse quieto mientras se trabaja mas abajo.
   
      Con height fijo al viewport, el scroll pasa a ser de adentro: cada
      pantalla decide que parte suya se mueve.
    */
    <div style={{ display: "flex", height: "100vh",
      fontFamily: "DM Sans, sans-serif", background: "#F4F5F7" }}>
      <Sidebar user={user} isAdmin={isAdmin} location={location} />
      {/* minHeight 0: un hijo flex no se encoge por debajo de su contenido sin
          esto, y entonces el `overflow: auto` del main nunca llega a aplicar. */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column",
        minWidth: 0, minHeight: 0 }}>
        <Topbar location={location} vista={vista} />
        <main style={{ flex: 1, overflow: "auto", minHeight: 0, padding: "1.5rem 2rem" }}>
          <ShopContext.Provider value={{ isSH, setIsSH, topStats, setTopStats, vista, setVista }}>
            <Outlet context={{ user, isAdmin }} />
          </ShopContext.Provider>
        </main>
      </div>
    </div>
  );
}

