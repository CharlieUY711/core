import { useEffect, useState, createContext, useContext } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../../utils/supabase/client";
import { cargarCapacidades } from "../utils/capacidades";
import { useCatalogoDeApps } from "../ui/catalogoDeApps";
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
  /*
   * De que se trata la vista. Una linea, en la barra de arriba.
   *
   * Antes cada herramienta la dibujaba adentro, como una caja que ocupaba una
   * fila entera arriba de lo que el usuario vino a ver, y cada una elegia su
   * color. Arriba esta siempre en el mismo lugar y no le saca lugar a nada.
   */
  explicacion: string;
  setExplicacion: (v: string) => void;
}
export const ShopContext = createContext<ShopCtx>({
  isSH: false, setIsSH: () => {}, topStats: [], setTopStats: () => {},
  vista: "", setVista: () => {},
  explicacion: "", setExplicacion: () => {},
});
export const useShop = () => useContext(ShopContext);

// ─── Menú ─────────────────────────────────────────────────────────────────────
/*
 * `soloTiendas`: lo que no tiene sentido para CORE Market.
 *
 * La plataforma administra, no vende: no tiene ordenes que despachar ni una
 * vidriera propia que editar. Mostrarselo igual seria ofrecerle pantallas
 * vacias — y peor, sugerirle que deberia tener algo ahi.
 */
/*
 * El menú de la izquierda: lo que se usa para operar.
 *
 * Sale del mismo catálogo que "Herramientas y Apps" —`catalogoDeApps`— porque
 * son dos vistas de lo mismo: el sidebar muestra lo de todos los días, la otra
 * muestra todo lo disponible. Con dos listas, agregar algo sería acordarse de
 * dos lugares, y aparecería en una y no en la otra.
 *
 * CORE Market ve menos, y no por permisos: administra y no vende, así que no
 * tiene publicaciones, pedidos ni vidriera. Lo que sí usa para operar —la
 * Biblioteca del catálogo compartido, el Vault y el editor de imágenes— está
 * acá como en cualquier tienda.
 */
const entradaDeApps = { path: "/admin/aplicaciones", label: "Herramientas y Apps" };


/*
 * Tiendas y Plataforma salieron del menú: son secciones del Dashboard de CORE
 * Market, y se llega a ellas desde su barra.
 *
 * Estaban acá como una sección aparte, y eran dos navegaciones para lo mismo:
 * el menú decía "Plataforma" y adentro había otra barra con las secciones. Una
 * sola barra, en el lugar donde se administra.
 */

/*
 * Analytics se fue al catálogo: es una funcionalidad como las otras, y tenerla
 * sola bajo un título "Gestión" era un encabezado para un solo renglón.
 */
const adminSections: { key: string; section: string;
  items: { path: string; label: string; soloTiendas?: boolean }[] }[] = [];

// ─── Nombre de app desde BRAND ───────────────────────────────────────────────
/**
 * Como se llama esto donde estas parado.
 *
 * En el front la vidriera es "Market" o "Second" — es lo que ve quien compra.
 * En el panel es "CORE Market": el que administra la plataforma no esta en una
 * vidriera, esta en el sistema que las administra. Decir "Market" aca hacia
 * pensar que el panel era el de una sola vidriera.
 */
function useAppName() {
  return "CORE Market";
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
/**
 * Quien sos, y en que tienda estas parado.
 *
 * UNA PERSONA, VARIAS TIENDAS
 * El perfil es de una persona fisica. Esa persona puede administrar N tiendas
 * —vender en dos paises son dos tiendas, con su moneda, sus impuestos y su
 * inscripcion fiscal, porque son dos operaciones distintas— y lo que las une
 * es ella.
 *
 * El token lleva UNA tienda a la vez: la marcada por defecto. Por eso cambiar
 * de tienda no alcanza con marcarla, hay que renovar la sesion para que el
 * hook vuelva a correr y escriba el claim nuevo. Sin eso se cambia de tienda y
 * se sigue viendo la anterior, que es peor que no poder cambiar.
 */
function UserAvatar({ user, isAdmin }: { user: any; isAdmin: boolean }) {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [tiendas, setTiendas] = useState<{ id: string; nombre: string;
    por_defecto: boolean; es_plataforma: boolean }[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cambiando, setCambiando] = useState(false);
  const navegar = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem(`avatar_${user?.id}`);
    if (saved) setAvatar(saved);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("mis_tiendas").then(({ data, error }) => {
      if (error) { console.warn("[tiendas]", error.message); return; }
      setTiendas((data ?? []) as typeof tiendas);
    });
  }, [user]);

  const cambiarTienda = async (id: string) => {
    setCambiando(true);
    const { error } = await supabase.rpc("cambiar_tienda_activa", { p_store_id: id });
    if (error) { setCambiando(false); console.warn("[tiendas]", error.message); return; }
    // El claim `store_id` se escribe al emitir el token. Sin renovar la sesion
    // el cambio no llega a ninguna consulta.
    await supabase.auth.refreshSession();
    window.location.reload();
  };

  const activa = tiendas.find(t => t.por_defecto) ?? tiendas[0];


  return (
    <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.08)",
      display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div onClick={() => navegar("/admin/profile")} title="Mi perfil" style={{
          width: "40px", height: "40px", borderRadius: "50%", cursor: "pointer",
          overflow: "hidden", border: `2px solid ${isAdmin ? BRAND.primary : BRAND.accent}`,
          background: "rgba(255,255,255,0.1)", display: "flex",
          alignItems: "center", justifyContent: "center" }}>
          {avatar
            ? <img src={avatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: "1.1rem" }}>{isAdmin ? "👑" : "👤"}</span>}
        </div>
        {/* El lapiz lleva a Mi perfil, que es donde se edita todo — la foto
            incluida. Antes abria el selector de archivos, asi que el perfil no
            tenia como abrirse desde aca. */}
        <div onClick={() => navegar("/admin/profile")} title="Mi perfil" style={{
          position: "absolute", bottom: "-2px", right: "-2px", width: "16px", height: "16px",
          borderRadius: "50%", background: BRAND.primary, display: "flex",
          alignItems: "center", justifyContent: "center", cursor: "pointer",
          fontSize: "0.55rem", border: `2px solid ${BRAND.secondary}` }}>✏️</div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.78rem", fontWeight: 600,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "130px" }}>
          {user?.user_metadata?.nombre || user?.email?.split("@")[0] || "Usuario"}
        </div>
        <div style={{ color: isAdmin ? BRAND.primary : BRAND.accent,
          fontSize: "0.65rem", fontWeight: 700, marginTop: "2px" }}>
          {isAdmin ? "Administrador" : "Usuario"}
        </div>

        {/* En qué tienda estás parado. Con una sola no hay nada que elegir, así
            que se muestra y punto; con varias, se cambia desde acá. */}
        {activa && (
          <div style={{ position: "relative", marginTop: 3 }}>
            <button
              onClick={() => tiendas.length > 1 && setAbierto(a => !a)}
              disabled={tiendas.length < 2 || cambiando}
              title={tiendas.length > 1 ? "Cambiar de tienda" : undefined}
              style={{
                background: "transparent", border: "none", padding: 0,
                cursor: tiendas.length > 1 ? "pointer" : "default",
                fontSize: "0.7rem", fontWeight: 700, color: BRAND.primary,
                display: "flex", alignItems: "center", gap: 4, maxWidth: 150,
              }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis",
                whiteSpace: "nowrap" }}>
                {cambiando ? "Cambiando…" : activa.nombre}
              </span>
              {tiendas.length > 1 && <span style={{ fontSize: "0.5rem", opacity: .7 }}>▾</span>}
            </button>

            {abierto && (
              <div onMouseLeave={() => setAbierto(false)} style={{
                position: "absolute", left: 0, top: "100%", zIndex: 400,
                background: "#fff", border: "1px solid var(--border)", borderRadius: 9,
                boxShadow: "0 8px 24px rgba(0,0,0,.2)", minWidth: 190, padding: 4 }}>
                {tiendas.map(t => (
                  <button key={t.id} onClick={() => { setAbierto(false); void cambiarTienda(t.id); }}
                    style={{ display: "block", width: "100%", textAlign: "left",
                      padding: "0.4rem 0.6rem", border: "none", borderRadius: 6,
                      cursor: "pointer", fontSize: "0.78rem",
                      background: t.por_defecto ? "rgba(0,0,0,.05)" : "transparent",
                      fontWeight: t.por_defecto ? 700 : 500, color: "#374151" }}>
                    {t.nombre}
                    {t.es_plataforma && (
                      <span style={{ marginLeft: 6, fontSize: "0.62rem", fontWeight: 800,
                        color: BRAND.accent }}>PLATAFORMA</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ user, isAdmin, esPlataforma, location }: {
  user: any; isAdmin: boolean; esPlataforma: boolean; location: any;
}) {
  const appName = useAppName();
  const { deSidebar } = useCatalogoDeApps();
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

        {[
          { path: "/admin", label: "Dashboard", exact: true },
          /* Del catálogo, no de una lista escrita acá: lo que se ofrece lo
             decide CORE Market en su configurador. */
          ...deSidebar.map(f => ({ path: f.ruta!, label: f.nombre, exact: false })),
          { ...entradaDeApps, exact: false },
        ].map(item => {
          const active = isActive(item.path, item.exact);
          return (
            <Link key={item.path} to={item.path} style={linkStyle(active)}>
              {item.label}
            </Link>
          );
        })}

        {[
          ...(isAdmin ? adminSections : []),
        ].map(({ key, section, items }) => ({
          key, section,
          items: items.filter(i => !((i as { soloTiendas?: boolean }).soloTiendas && esPlataforma)),
        }))
         .filter(({ items }) => items.length > 0)
         .map(({ key, section, items }) => {
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
/**
 * La barra de arriba: dónde estoy y el estado general de lo que estoy mirando.
 *
 * POR QUÉ LOS CONTADORES VIVEN ACÁ Y NO EN LA PÁGINA
 * Porque son el estado del módulo entero —cuánto hay— y no de la sección en la
 * que uno está parado. Adentro de la página ocupaban una fila completa arriba
 * del contenido, empujando hacia abajo lo que uno vino a ver, y había que
 * volver a dibujarlos en cada pantalla que quisiera mostrarlos.
 *
 * ES LA REGLA GENERAL, NO UN ARREGLO DE BIBLIOTECA
 * Toda vista que tenga contadores los publica acá con `setTopStats`, y los
 * limpia al salir. Que una pantalla se los dibuje por su cuenta arriba del
 * contenido es la excepción a corregir, no una alternativa.
 *
 * Así la información general queda siempre en el mismo lugar sin competir con
 * el contenido, y la barra de secciones queda libre para lo específico de la
 * sección —última carga, última edición, último respaldo.
 *
 * Las vistas que no tengan nada que contar no publican nada y la barra no
 * muestra el bloque: no hay un hueco esperando a que alguien lo llene.
 */
function Topbar({ location, vista, explicacion, topStats }: {
  location: any; vista: string; explicacion: string;
  topStats: { label: string; value: number | string; color: string }[];
}) {
  /*
   * El nombre del módulo sale del catálogo: si CORE Market le cambia el nombre
   * a una funcionalidad, la barra de arriba lo dice igual que el menú. Con una
   * lista escrita acá, el menú diría "Mis pedidos" y la barra "Mis órdenes".
   */
  const { apps } = useCatalogoDeApps();

  const allItems = [
    { path: "/admin", label: "Dashboard", exact: true },
    ...apps.filter(a => a.ruta).map(a => ({ path: a.ruta!, label: a.nombre, exact: false })),
    { path: "/admin/aplicaciones", label: "Herramientas y Apps", exact: false },
    { path: "/admin/tiendas",      label: "Tiendas",             exact: false },
    { path: "/admin/plataforma",   label: "Plataforma",          exact: false },
    { path: "/admin/profile",      label: "Mi perfil",           exact: false },
  ];

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
      {/* `minWidth: 0` para que este lado pueda encogerse: sin eso la
          explicacion empuja los contadores fuera de la barra en vez de
          recortarse. */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem",
        minWidth: 0, fontSize: "0.88rem", color: "rgba(255,255,255,0.9)" }}>
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

        {/* De que se trata. Se recorta con puntos suspensivos y el texto entero
            queda en el `title`: en una barra de 52px no entra un parrafo, y
            hacerla mas alta seria robarle alto a la pantalla en TODAS las
            vistas para una linea que se lee una vez. */}
        {explicacion && (
          <>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.75rem" }}>·</span>
            <span title={explicacion} style={{
              color: "rgba(255,255,255,0.5)", fontWeight: 400, fontSize: "0.78rem",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              minWidth: 0,
            }}>
              {explicacion}
            </span>
          </>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Los contadores del módulo. Compactos: acompañan, no protagonizan. */}
        {topStats.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "14px",
            marginRight: "6px" }}>
            {topStats.map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "baseline", gap: "5px" }}>
                <span style={{ fontSize: "0.95rem", fontWeight: 800, color: s.color }}>
                  {s.value}
                </span>
                <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.55)" }}>
                  {s.label}
                </span>
              </div>
            ))}
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />
          </div>
        )}

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

  /*
   * Si esta sesion es la de CORE Market.
   *
   * No es un rol nuevo: es tener el store_id de la tienda marcada como
   * plataforma. Lo decide el servidor -`soy_la_plataforma()`- y no el
   * navegador, asi que no se puede falsear escondiendo o mostrando un menu.
   *
   * Arranca en `false`: mientras no se sepa, no se muestra. Al reves —mostrar
   * y despues esconder— el menu de administracion parpadearia para todos.
   */
  const [esPlataforma, setEsPlataforma] = useState(false);

  useEffect(() => {
    let vivo = true;

    supabase.rpc("soy_la_plataforma").then(({ data, error }) => {
      if (!vivo) return;
      if (error) { console.warn("[plataforma]", error.message); return; }
      setEsPlataforma(data === true);
    });

    // Las capacidades de la tienda, una sola vez al entrar al panel. Antes
    // `tieneCapacidad()` devolvia true fijo porque no habia de donde leer.
    void cargarCapacidades();

    return () => { vivo = false; };
  }, []);
  const [vista, setVista] = useState("");
  const [explicacion, setExplicacion] = useState("");

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
      <Sidebar user={user} isAdmin={isAdmin} esPlataforma={esPlataforma} location={location} />
      {/* minHeight 0: un hijo flex no se encoge por debajo de su contenido sin
          esto, y entonces el `overflow: auto` del main nunca llega a aplicar. */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column",
        minWidth: 0, minHeight: 0 }}>
        <Topbar location={location} vista={vista} explicacion={explicacion}
          topStats={topStats} />
        <main style={{ flex: 1, overflow: "auto", minHeight: 0, padding: "1.5rem 2rem" }}>
          <ShopContext.Provider value={{ isSH, setIsSH, topStats, setTopStats,
            vista, setVista, explicacion, setExplicacion }}>
            <Outlet context={{ user, isAdmin }} />
          </ShopContext.Provider>
        </main>
      </div>
    </div>
  );
}

