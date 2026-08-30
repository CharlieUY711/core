/**
 * Qué necesita atención.
 *
 * POR QUÉ EXISTE
 * Porque todo lo que muestra lo encontramos BUSCÁNDOLO, uno por uno, mirando
 * tablas: cuatro territorios activos que no pueden operar, tres credenciales
 * nunca verificadas, Mercado Libre instalado y sin cuenta conectada, una
 * publicación colgada de la plataforma que administra y no vende.
 *
 * Ninguna de esas cosas fallaba con un error. Todas devolvían un número o una
 * pantalla vacía, que es la forma en que un sistema rompe sin avisar. Un
 * dashboard es exactamente el lugar donde no habría que salir a buscarlas.
 *
 * CADA AVISO LLEVA A DONDE SE ARREGLA
 * Un aviso que dice qué está mal y no dice dónde arreglarlo obliga a
 * adivinar, y la próxima vez se ignora.
 *
 * CUANDO NO HAY NADA, SE DICE
 * "Todo en orden" es información: significa que se miró. Una pantalla vacía
 * no distingue entre "está todo bien" y "no se comprobó nada".
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../utils/supabase/client";

interface Estado {
  territorios_sin_configurar: number;
  territorios_total: number;
  herramientas_sin_verificar: number;
  herramientas_con_error: number;
  canales_sin_conectar: number;
  publicaciones_de_la_plataforma: number;
  tiendas: number;
  tiendas_activas: number;
  tiendas_sin_duenio: number;
  cotizacion_mas_vieja: string | null;
  fichas_compartidas: number;
  funcionalidades: number;
  herramientas: number;
  apps: number;
  departamentos: number;
  categorias: number;
  subcategorias: number;
}

type Gravedad = "error" | "atencion";

interface Aviso {
  gravedad: Gravedad;
  texto: string;
  porQue: string;
  ir?: { label: string; a: string };
}

export function EstadoDeLaPlataforma() {
  const [e, setE] = useState<Estado | null>(null);
  const [cargando, setCargando] = useState(true);
  const navegar = useNavigate();

  useEffect(() => {
    supabase.rpc("estado_de_la_plataforma").then(({ data, error }) => {
      if (!error) setE(data as Estado);
      setCargando(false);
    });
  }, []);

  if (cargando) {
    return <div style={{ padding: "3rem", textAlign: "center", color: "var(--gray-400)" }}>Cargando…</div>;
  }
  if (!e) return null;

  const dias = e.cotizacion_mas_vieja
    ? Math.floor((Date.now() - new Date(e.cotizacion_mas_vieja).getTime()) / 86400000)
    : null;

  const avisos: Aviso[] = [
    e.publicaciones_de_la_plataforma > 0 && {
      gravedad: "error" as const,
      texto: e.publicaciones_de_la_plataforma === 1
        ? "CORE Market tiene 1 publicación"
        : `CORE Market tiene ${e.publicaciones_de_la_plataforma} publicaciones`,
      porQue: "La plataforma administra y no vende. Hay que moverlas a una tienda.",
      ir: { label: "Ver tiendas", a: "/admin/plataforma/tiendas" },
    },

    e.herramientas_con_error > 0 && {
      gravedad: "error" as const,
      texto: `${e.herramientas_con_error} herramienta(s) con error`,
      porQue: "La última prueba falló. Lo que dependa de ellas no está funcionando.",
      ir: { label: "Ver herramientas", a: "/admin/aplicaciones" },
    },

    dias !== null && dias > 2 && {
      gravedad: "error" as const,
      texto: `La cotización más reciente es de hace ${dias} días`,
      porQue: "El trabajo diario dejó de correr. Los precios convertidos salen con un valor viejo, sin avisar.",
      ir: { label: "Ver territorios", a: "/admin/plataforma/territorios" },
    },

    e.territorios_sin_configurar > 0 && {
      gravedad: "atencion" as const,
      texto: `${e.territorios_sin_configurar} de ${e.territorios_total} territorios sin configurar`,
      porQue: "Figuran activos pero les falta moneda o tasas: no se puede operar ahí.",
      ir: { label: "Configurar", a: "/admin/plataforma/territorios" },
    },

    e.herramientas_sin_verificar > 0 && {
      gravedad: "atencion" as const,
      texto: `${e.herramientas_sin_verificar} credencial(es) nunca verificada(s)`,
      porQue: "Están cargadas, pero nadie comprobó que funcionen.",
      ir: { label: "Probar", a: "/admin/aplicaciones" },
    },

    e.canales_sin_conectar > 0 && {
      gravedad: "atencion" as const,
      texto: `${e.canales_sin_conectar} canal(es) sin ninguna cuenta conectada`,
      porQue: "Estar instalada no es estar conectada: no pueden publicar ni cobrar.",
      ir: { label: "Ver apps", a: "/admin/aplicaciones" },
    },

    e.tiendas_sin_duenio > 0 && {
      gravedad: "atencion" as const,
      texto: `${e.tiendas_sin_duenio} tienda(s) sin dueño`,
      porQue: "Nadie puede entrar a administrarlas.",
      ir: { label: "Ver tiendas", a: "/admin/plataforma/tiendas" },
    },
  ].filter(Boolean) as Aviso[];

  /*
   * Monitores. Sólo miran: cada uno tiene su lugar en el menú, y repetir el
   * control acá serían dos lugares donde cambiar lo mismo.
   */
  const numeros = [
    { label: "Tiendas",     valor: `${e.tiendas_activas} de ${e.tiendas}`,
      nota: "activas", a: "/admin/plataforma/tiendas" },
    { label: "Territorios", valor: `${e.territorios_total - e.territorios_sin_configurar} de ${e.territorios_total}`,
      nota: "configurados", a: "/admin/plataforma/territorios" },
    { label: "Funcionalidades", valor: String(e.funcionalidades),
      nota: "disponibles", a: "/admin/aplicaciones" },
    { label: "Herramientas y apps", valor: `${e.herramientas} + ${e.apps}`,
      nota: "herramientas y apps disponibles", a: "/admin/aplicaciones" },
    { label: "Taxonomía", valor: `${e.departamentos} · ${e.categorias} · ${e.subcategorias}`,
      nota: "departamentos, categorías y subcategorías", a: "/admin/catalog" },
    { label: "Catálogo compartido", valor: String(e.fichas_compartidas),
      nota: "fichas que ven todas las tiendas", a: "/admin/biblioteca" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {avisos.length === 0 ? (
        <div style={{ padding: "0.85rem 1rem", borderRadius: 12, background: "#F0FDF4",
          border: "1px solid #86efac", color: "#166534", fontWeight: 700, fontSize: "0.85rem" }}>
          Todo en orden. Territorios configurados, herramientas verificadas y canales conectados.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {avisos.map((a, i) => {
            const rojo = a.gravedad === "error";
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12,
                padding: "0.7rem 0.9rem", borderRadius: 11,
                background: rojo ? "#FEF2F2" : "rgba(245,158,11,.10)",
                border: `1px solid ${rojo ? "#FCA5A5" : "rgba(245,158,11,.35)"}` }}>
                <span style={{ fontSize: "1.05rem" }}>{rojo ? "⛔" : "⚠"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.84rem",
                    color: rojo ? "#B91C1C" : "#B45309" }}>{a.texto}</div>
                  <div style={{ fontSize: "0.76rem", color: "var(--mute)" }}>{a.porQue}</div>
                </div>
                {a.ir && (
                  <button onClick={() => navegar(a.ir!.a)} style={{
                    padding: "0.35rem 0.8rem", borderRadius: 7, cursor: "pointer",
                    border: `1.5px solid ${rojo ? "#B91C1C" : "#B45309"}`,
                    background: "transparent", color: rojo ? "#B91C1C" : "#B45309",
                    fontSize: "0.76rem", fontWeight: 700, whiteSpace: "nowrap",
                    fontFamily: "DM Sans, sans-serif" }}>
                    {a.ir.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "grid", gap: "0.75rem",
        gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))" }}>
        {numeros.map(n => (
          <div key={n.label} onClick={() => navegar(n.a)}
            title="Ir"
            style={{ background: "#fff", border: "1px solid var(--border)",
              borderRadius: 11, padding: "0.8rem 0.9rem", cursor: "pointer" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--mute)",
              textTransform: "uppercase", letterSpacing: ".06em" }}>{n.label}</div>
            {/* Los números a la derecha no: acá son el contenido, no una columna. */}
            <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#111",
              fontVariantNumeric: "tabular-nums", margin: "0.15rem 0" }}>{n.valor}</div>
            <div style={{ fontSize: "0.73rem", color: "var(--gray-400)" }}>{n.nota}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EstadoDeLaPlataforma;
