/**
 * Tiendas — el creador y configurador de CORE Market.
 *
 * QUIÉN VE ESTO
 * Sólo CORE Market. No hace falta un sistema de roles nuevo: "soy la
 * plataforma" es tener el `store_id` de la tienda marcada como plataforma, y
 * lo responde el servidor. Las funciones que crean y configuran lo verifican
 * ellas mismas, así que esconder el menú es comodidad, no seguridad.
 *
 * LA MISMA TABLA QUE TODO EL PANEL
 * Check por fila, botones en la barra. Lo que se escribe en la fila es lo que
 * identifica a la tienda —código y nombre—; lo que se configura vive adentro,
 * al abrirla. Crear una tienda son dos campos; ponerle capacidades es otra
 * decisión, de otro momento.
 *
 * LA PRUEBA DE ESTA PANTALLA ES COMITA
 * COMITA no se crea con una migración: se crea con esto. Si no alcanza para
 * crearla, no está terminada.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../utils/supabase/client";
import { BarraDeAccionesSuelta } from "../components/BarraDeAcciones";
import { Tabla, fecha } from "../components/Tabla";
import { MiembrosDeTienda } from "../components/MiembrosDeTienda";
import { AppsDeTienda } from "../components/AppsDeTienda";
import { Pantalla, usePantalla } from "../components/Pantalla";
import { CAPACIDADES, VIDRIERAS } from "../utils/capacidades";
import { useShop } from "../components/AdminLayout";

const ACCENT = "var(--brand-madre)";
const BLUE   = "var(--brand-navy)";

interface Tienda {
  id: string; codigo: string; nombre: string;
  es_plataforma: boolean; activa: boolean;
  capacidades: string[]; vidrieras: string[];
  moneda_base: string | null; pais: string | null;
  owner_id: string | null; owner_email: string | null;
  publicaciones: number; fichas: number; creada: string;
}

export default function AdminTiendas() {
  const pantalla = usePantalla();
  const t = pantalla.tablas;
  const { setVista, setTopStats } = useShop();

  const [tiendas,  setTiendas]  = useState<Tienda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const avisar = pantalla.avisar;

  const traer = useCallback(async () => {
    const { data, error } = await supabase.rpc("listar_tiendas");
    if (error) {
      // El mensaje de la función explica el caso —no sos la plataforma— así que
      // se muestra tal cual en vez de un "no se pudo cargar" que no ubica.
      setError(error.message); setTiendas([]);
    } else {
      setError(null); setTiendas((data ?? []) as Tienda[]);
    }
    setCargando(false);
  }, []);

  useEffect(() => { void traer(); }, [traer]);

  useEffect(() => {
    setVista("");
    const propias = tiendas.filter(x => !x.es_plataforma);
    setTopStats(propias.length ? [
      { label: "Tiendas", value: propias.length, color: "#fff" },
      { label: "Activas", value: propias.filter(x => x.activa).length, color: "#4ADE80" },
    ] : []);
    return () => { setTopStats([]); setVista(""); };
  }, [tiendas, setTopStats, setVista]);

  const rpc = async (fn: string, params: Record<string, unknown>, ok: string) => {
    const { error } = await supabase.rpc(fn, params);
    if (error) { avisar(error.message, false); throw new Error(error.message); }
    await traer();
    avisar(ok);
  };

  const [busca, setBusca] = useState("");

  /*
   * Los territorios, con su moneda. Salen de Definiciones, que es donde se
   * definen: escribir la lista acá sería un segundo lugar donde agregar un país
   * —y el que se olvida siempre es el segundo—.
   */
  const [territorios, setTerritorios] = useState<
    { iso: string; nombre: string; moneda: string | null }[]>([]);

  useEffect(() => {
    supabase
      .from("countries")
      .select("iso_code, name, status, currencies(code)")
      .eq("status", "active")
      .order("name")
      .then(({ data, error }) => {
        if (error) { console.warn("[tiendas] territorios:", error.message); return; }
        setTerritorios((data ?? []).map((c: {
          iso_code: string; name: string; currencies: { code: string }[] | null
        }) => ({
          iso: c.iso_code, nombre: c.name,
          moneda: c.currencies?.[0]?.code ?? null,
        })));
      });
  }, []);

  const monedaDe = (iso: string) =>
    territorios.find(t => t.iso === iso)?.moneda ?? null;

  /* Las desactivadas que están elegidas: de eso depende si "Reactivar" se
     puede apretar. Se calcula acá porque la barra se dibuja antes que la
     tabla. */
  const elegidas = pantalla.tablas.seleccionadas("tiendas");
  const apagadasElegidas = tiendas.filter(s => elegidas.has(s.id) && !s.activa);
  const q = busca.trim().toLowerCase();
  const visibles = !q ? tiendas : tiendas.filter(s =>
    `${s.nombre} ${s.codigo} ${s.owner_email ?? ""}`.toLowerCase().includes(q));

  /* Se declara ANTES de dibujar: la barra va arriba en el árbol, así que si
     esto viviera adentro del JSX los botones no sabrían qué se puede hacer
     hasta un render después. */
  const nivelTiendas = t.nivel("tiendas", {
          columnas: [
            { id: "nombre", label: "Tienda", editable: true, ancho: 240,
              ver: f => (
                <span>
                  <b>{String(f.nombre)}</b>
                  {(f.es_plataforma as boolean) && (
                    <span style={{ marginLeft: 7, fontSize: "0.62rem", fontWeight: 800,
                      padding: "1px 7px", borderRadius: 999, color: BLUE,
                      background: "color-mix(in srgb, var(--brand-navy) 10%, transparent)" }}>
                      PLATAFORMA
                    </span>
                  )}
                </span>
              ) },
            { id: "codigo", label: "Código", ancho: 120 },
            /* Apagada se ve, no desaparece. Y se dice: la opacidad sola es
               fácil de no notar, y una tienda desactivada que parece activa es
               media hora buscando por qué "no anda". */
            { id: "estado", label: "Estado", ancho: 90,
              chip: f => (f.activa as boolean)
                ? null
                : { tono: "atencion" as const, texto: "DESACTIVADA" } },
            { id: "duenio", label: "Dueño",  ancho: 200,
              ver: f => f.duenio ? String(f.duenio)
                : <span style={{ color: "#B45309", fontWeight: 600 }}>sin dueño</span> },
            { id: "vidrieras_txt",   label: "Vidrieras",   ancho: 140 },
            { id: "capacidades_txt", label: "Capacidades", ancho: 220 },
            /*
             * EL TERRITORIO MANDA Y LA MONEDA ES SU CONSECUENCIA.
             *
             * Eran dos campos de texto libre e independientes: se podía poner
             * país UY con moneda USD y nada lo impedía. Cada territorio ya
             * tiene su moneda en Definiciones, así que la moneda no era un dato
             * de la tienda — era un dato del territorio, copiado a mano.
             *
             * Ahora se elige de una lista y la moneda se muestra sola. Un
             * territorio sin moneda definida se dice, en vez de dejar el hueco:
             * es un territorio con el que no se puede operar.
             */
            { id: "pais", label: "Territorio", editable: true, ancho: 120,
              opciones: territorios.map(t => ({ valor: t.iso, label: t.nombre })),
              ver: f => {
                const t = territorios.find(x => x.iso === f.pais);
                return t ? t.nombre : String(f.pais || "—");
              } },
            { id: "moneda_base", label: "Moneda", ancho: 80,
              ver: f => {
                const m = monedaDe(String(f.pais));
                return m ?? (
                  <span style={{ color: "#B45309", fontWeight: 600 }}
                    title="El territorio no tiene moneda definida: se configura en Definiciones">
                    sin moneda
                  </span>
                );
              } },
            { id: "publicaciones", label: "Publ.",  numero: true, ancho: 60 },
            { id: "fichas",        label: "Fichas", numero: true, ancho: 60 },
            { id: "creado", label: "Creada", rastro: true, ancho: 80, ver: f => fecha(f.creado) },
          ],
          filas: visibles.map(s => ({
            clave: s.id, nombre: s.nombre, codigo: s.codigo, estado: "",
            es_plataforma: s.es_plataforma, activa: s.activa,
            duenio: s.owner_email ?? "",
            moneda_base: s.moneda_base ?? "", pais: s.pais ?? "",
            vidrieras_txt: s.vidrieras?.length
              ? s.vidrieras.map(v => VIDRIERAS.find(x => x.id === v)?.label ?? v).join(" · ")
              : "—",
            capacidades_txt: s.capacidades?.length
              ? s.capacidades.map(c => CAPACIDADES.find(x => x.id === c)?.label ?? c).join(" · ")
              : "—",
            publicaciones: s.publicaciones, fichas: s.fichas, creado: s.creada,
            s,
          })),
          inactiva: f => !(f.activa as boolean),
          nombreDe: f => String(f.nombre),

          // Crear son dos campos: código y nombre. Lo demás se configura al
          // abrir la fila, que es otra decisión y de otro momento.
          onCrear: v => rpc("crear_tienda", {
            p_codigo: v.codigo ?? slugCorto(v.nombre), p_nombre: v.nombre,
            p_owner_email: null, p_capacidades: [], p_vidrieras: ["market"],
            p_moneda_base: v.moneda_base || "UYU", p_pais: v.pais || "UY",
          }, `Tienda "${v.nombre}" creada. Falta asignarle dueño.`),

          /* La moneda viaja CON el territorio y no se pide aparte: guardando
             sólo el país quedaría la moneda vieja de otro territorio, y nadie
             lo notaría hasta ver un precio en la moneda equivocada. */
          onGuardar: (f, v) => rpc("actualizar_tienda", {
            p_id: f.clave, p_nombre: v.nombre,
            p_pais: v.pais,
            p_moneda_base: monedaDe(v.pais) ?? "",
          }, "Guardado"),

          /* Reactivar. Sin esto, "Eliminar" desactivaba y no había ningún
             camino de vuelta: la tienda quedaba al 55% de opacidad para
             siempre. Es la misma trampa que ya corregimos en el catálogo —una
             marca que esconde la fila de la pantalla que podría quitarla— y
             acá era peor, porque deja un comercio sin poder operar. */
          onBorrar: async fs => {
            // Desactivar, no borrar: una tienda tiene publicaciones, fichas y
            // órdenes colgando. Borrarla de verdad es un pedido aparte y con
            // otro nombre.
            const problemas: string[] = [];
            for (const f of fs) {
              const { error } = await supabase.rpc("actualizar_tienda",
                { p_id: f.clave, p_activa: false });
              if (error) problemas.push(`${f.nombre}: ${error.message}`);
            }
            await traer();
            if (problemas.length) avisar(problemas[0], false);
            else avisar(`${fs.length} tienda(s) desactivada(s). No se borran: tienen publicaciones y órdenes.`);
          },

          detalle: f => <ConfigurarTienda s={f.s as Tienda} rpc={rpc} avisar={avisar} />,
  });

  return (
    /* La barra, el aviso, el error y el ancho los define `Pantalla`. Acá
       estaban escritos a mano, igual que en las otras dos pantallas — copiado
       tres veces es divergir tres veces. */
    <Pantalla p={pantalla}
      buscador={{ valor: busca, onCambio: setBusca }}
      /* Reactivar. Sin esto, "Eliminar" desactivaba y no había camino de
         vuelta: la tienda quedaba al 55% de opacidad para siempre. Es la misma
         trampa que ya corregimos en el catálogo —una marca que esconde la fila
         de la pantalla que podría quitarla— y acá era peor, porque deja un
         comercio sin poder operar.

         Está siempre, apagada si lo elegido ya está activo. */
      extra={[{
        label: "Reactivar",
        color: "var(--brand-navy)",
        desactivada: apagadasElegidas.length === 0,
        motivo: "Elegí una tienda desactivada",
        onClick: async () => {
          for (const s of apagadasElegidas) {
            await rpc("actualizar_tienda", { p_id: s.id, p_activa: true },
              `${s.nombre} vuelve a estar activa.`);
          }
        },
      }]}
      error={error}>
      {cargando ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--gray-400)" }}>Cargando…</div>
      ) : (
        <Tabla {...nivelTiendas} />
      )}
    </Pantalla>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

function ConfigurarTienda({ s, rpc, avisar }: {
  s: Tienda;
  rpc: (fn: string, p: Record<string, unknown>, ok: string) => Promise<void>;
  avisar: (texto: string, ok?: boolean) => void;
}) {
  const [correo, setCorreo] = useState("");

  const alternar = (campo: "capacidades" | "vidrieras", id: string) => {
    const actual = (campo === "capacidades" ? s.capacidades : s.vidrieras) ?? [];
    const nuevo = actual.includes(id) ? actual.filter(x => x !== id) : [...actual, id];
    void rpc("actualizar_tienda",
      { p_id: s.id, [campo === "capacidades" ? "p_capacidades" : "p_vidrieras"]: nuevo },
      "Guardado");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      {/* Quiénes trabajan acá y hasta dónde puede cada uno. Va PRIMERO: sin
          alguien que pueda entrar, configurar lo demás no sirve de nada. */}
      <Bloque titulo="Miembros"
        nota="Quiénes entran a esta tienda y qué puede hacer cada uno. El acceso lo da esta lista.">
        <MiembrosDeTienda storeId={s.id} avisar={avisar} />
      </Bloque>

      {/* TODO lo que la tienda tiene habilitado, en una lista: funcionalidades,
          capacidades, herramientas y apps. */}
      <Bloque titulo="Qué tiene habilitado"
        nota="Todo junto: las pantallas del producto, lo que consume servicios que se cobran, y lo que se conecta.">
        <AppsDeTienda storeId={s.id} avisar={avisar} />
      </Bloque>

      <Bloque titulo="Titular"
        nota="Quién figura como dueño de la tienda. El acceso NO sale de acá, sale de la lista de miembros.">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: "0.82rem", color: s.owner_email ? "#374151" : "#B45309",
            fontWeight: s.owner_email ? 400 : 600, minWidth: 180 }}>
            {s.owner_email ?? "sin dueño"}
          </span>
          <input value={correo} placeholder="alguien@ejemplo.com"
            onChange={e => setCorreo(e.target.value)}
            style={{ ...inp, width: 240 }} />
          <BarraDeAccionesSuelta acciones={[
            { label: s.owner_email ? "Cambiar" : "Asignar", color: ACCENT, destacado: true,
              desactivada: !correo.trim(), motivo: "Escribí el correo",
              onClick: () => { void rpc("actualizar_tienda",
                { p_id: s.id, p_owner_email: correo.trim() }, "Dueño asignado")
                .then(() => setCorreo("")); } },
          ]} />
        </div>
      </Bloque>

      <Bloque titulo="Vidrieras"
        nota={s.es_plataforma
          ? "CORE Market administra la plataforma y no vende: no publica en ninguna vidriera."
          : "Dónde puede publicar. Una tienda puede vender en las dos."}>
        <BarraDeAccionesSuelta acciones={VIDRIERAS.map(v => ({
          label: v.label, color: BLUE,
          activa: s.vidrieras?.includes(v.id),
          desactivada: s.es_plataforma, motivo: "CORE Market no vende",
          onClick: () => alternar("vidrieras", v.id),
        }))} />
      </Bloque>

      {/* El bloque de "Capacidades" estaba acá, aparte, con sus dos casillas.
          Se fue: las capacidades ahora son filas de la tabla de arriba, con
          todo lo demás. Dos lugares que respondían «qué tiene habilitado esta
          tienda» obligaban a mirar en dos lados y a saber de antemano cuál. */}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

const inp: React.CSSProperties = {
  padding: "0.35rem 0.55rem", border: "1.5px solid var(--border)", borderRadius: 7,
  fontSize: "0.8rem", outline: "none", background: "#fff", color: "#111",
  fontFamily: "DM Sans, sans-serif",
};

/** Un código a partir del nombre, para no pedir dos campos que dicen lo mismo. */
const slugCorto = (s?: string) => (s ?? "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function Bloque({ titulo, nota, children }: {
  titulo: string; nota?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#374151" }}>{titulo}</div>
      {nota && <div style={{ fontSize: "0.72rem", color: "var(--gray-400)", marginBottom: 6 }}>{nota}</div>}
      {children}
    </div>
  );
}
