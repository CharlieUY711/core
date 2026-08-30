/**
 * El catálogo de funcionalidades, herramientas y apps. Una sola vista.
 *
 * DOS LUGARES, LA MISMA VISTA
 * Se muestra en "Herramientas y Apps" —lo que hay disponible— y en el
 * configurador de CORE Market, que es exactamente lo mismo más los
 * interruptores. Antes eran dos componentes, uno con tarjetas y otro con una
 * tabla, cada uno con su criterio. Dos dibujos de la misma cosa divergen sin
 * que nadie lo note, y la pantalla donde se configura deja de parecerse a la
 * que se usa.
 *
 * `configurable` no cambia QUÉ se muestra: agrega tres columnas. Es la
 * diferencia entre mirar y decidir, no entre dos pantallas.
 *
 * POR QUÉ TABLA Y NO TARJETAS
 * Porque lo que importa acá son datos comparables entre filas: cuándo se
 * verificó cada una, en cuántas tiendas está, cuáles no se probaron nunca. En
 * tarjetas eso hay que leerlo una por una; en columnas se ve de un vistazo
 * cuál es la que está mal.
 *
 * TRES COSAS QUE NO SON LO MISMO
 *   FUNCIONALIDAD  un lugar donde trabajás. No se instala ni falla sola.
 *   HERRAMIENTA    un servicio que trabaja ADENTRO de otra pantalla. Nunca
 *                  "vas" a una herramienta: la búsqueda web ocurre mientras
 *                  cargás un artículo. Tiene clave y puede fallar.
 *   APP            un sistema de terceros con tu CUENTA del otro lado. Se
 *                  instala y además se conecta, que son dos cosas distintas.
 *
 * Importa porque el estado sólo tiene sentido para dos de las tres: las
 * funcionalidades no tienen esas columnas, y no se les inventa un guion — no
 * las tienen porque no pueden fallar.
 *
 * QUÉ ES "PROBAR"
 * Una llamada real y chica. No simula: si sale bien, funciona de verdad. El
 * resultado se guarda, porque una prueba sin rastro hay que repetirla cada vez
 * que alguien pregunta.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../utils/supabase/client";
import { ItemDeBarra } from "./BarraDeAcciones";
import { Pantalla, EstadoDePantalla } from "./Pantalla";
import { Tabla, Columna, Fila, Tono } from "./Tabla";
import { useCatalogoDeApps, AppDelCatalogo, olvidarCatalogo } from "../ui/catalogoDeApps";

const ACCENT = "var(--brand-madre)";

interface Credencial {
  plataforma: string; estado: string;
  actualizada: string | null; verificada: string | null;
  ultimo_error: string | null;
  /*
   * `en_plataforma` es lo que decide si CORE Market la tiene. Venía en la
   * respuesta desde siempre y NO SE LEÍA: el estado se calculaba con que la
   * credencial existiera en cualquier tenant, así que la plataforma veía
   * "INSTALADA" algo que no tenía. Es la peor clase de error: no falla, miente
   * con cara de dato.
   */
  en_plataforma: boolean;
  en_tiendas: number;
}

interface Estado {
  credenciales: Credencial[];
  canales: Record<string, { conectadas: number; ultima: string | null; con_error: number }>;
}

const fecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-UY",
    { day: "2-digit", month: "2-digit", year: "2-digit" }) : "nunca";

/**
 * La más vieja de varias, o "nunca" si a alguna le falta.
 *
 * Con varias plataformas, lo que importa de "verificada" es hace cuánto que no
 * se comprueba la PEOR: mostrar la más nueva diría que está al día una app que
 * tiene la mitad sin verificar nunca.
 */
const masVieja = (fechas: (string | null)[]) => {
  if (fechas.length === 0) return "";
  if (fechas.some(f => !f)) return "nunca";
  return fecha(fechas.map(f => f!).sort()[0]);
};

/** El nivel de la tabla. Uno solo: las tres son la misma lista, filtrada. */
const NIVEL = "apps";

const GRUPOS = [
  { tipo: "funcionalidad" as const, titulo: "Funcionalidades",
    nota: "Lugares del panel. Son parte del producto: no se instalan ni se configuran. Las que se usan a diario están también en el menú." },
  { tipo: "herramienta" as const, titulo: "Herramientas",
    nota: "Trabajan adentro de otras pantallas. Tienen credencial, y por eso pueden fallar sin que nadie se entere." },
  { tipo: "app" as const, titulo: "Apps",
    nota: "Sistemas de terceros con una cuenta del otro lado. Estar instalada no es estar conectada." },
];

export function CatalogoDeApps({ p, configurable = false }: {
  p: EstadoDePantalla;
  /** Agrega las columnas de configuración. No cambia qué se muestra. */
  configurable?: boolean;
}) {
  const navegar = useNavigate();
  const { tablas } = p;
  const avisar = p.avisar;

  /* Las tres son la misma lista. Antes eran tres tablas apiladas, cada una con
     su encabezado: para comparar dos herramientas de grupos distintos había
     que mirar dos tablas con columnas en distinto lugar. */
  const [seccion, setSeccion] = useState<string>("todo");
  const [busca,   setBusca]   = useState("");
  const { apps, cargando, recargar } = useCatalogoDeApps(configurable);

  const [estado,   setEstado]   = useState<Estado | null>(null);
  const [probando, setProbando] = useState<string | null>(null);
  const [ocupado,  setOcupado]  = useState<string | null>(null);
  const [salida,   setSalida]   = useState<Record<string, { ok: boolean; texto: string }>>({});

  const decir = avisar;

  const traerEstado = useCallback(async () => {
    const { data, error } = await supabase.rpc("aplicaciones_de_plataforma");
    // Una tienda no puede leer esto y no es un error de la pantalla: se
    // muestran las filas sin el estado de las credenciales, que es información
    // de la plataforma.
    if (error) { setEstado(null); return; }
    setEstado(data as Estado);
  }, []);

  useEffect(() => { void traerEstado(); }, [traerEstado]);

  /*
   * Las credenciales de TODAS las plataformas que toca la app.
   *
   * Antes se buscaba una sola, así que ML & MP mostraba lo de Mercado Libre y
   * callaba lo de Mercado Pago, y Meta mostraba lo de Instagram y callaba
   * Facebook y WhatsApp.
   */
  const credsDe = (a: AppDelCatalogo) =>
    a.vault_platforms
      .map(p => estado?.credenciales.find(c => c.plataforma === p) ?? null)
      .filter((c): c is Credencial => c !== null);

  /* Los canales de la app. ML & MP tiene dos: publicar y cobrar se conectan
     por separado aunque el login sea uno. */
  const canalesDe = (a: AppDelCatalogo) =>
    a.codigo === "ml"
      ? [
          { label: "Mercado Libre", c: estado?.canales?.mercadolibre },
          { label: "Mercado Pago",  c: estado?.canales?.mercadopago  },
        ].filter(x => x.c)
      : [];

  const sinVerificar = apps.filter(a => {
    if (a.tipo === "funcionalidad") return false;
    const cs = credsDe(a);
    return cs.length > 0 && cs.some(c => !c.verificada);
  }).length;

  /* ------------------------------------------------------------------ */

  const probar = async (a: AppDelCatalogo) => {
    if (!a.prueba) return;
    setProbando(a.codigo);
    setSalida(s => ({ ...s, [a.codigo]: { ok: true, texto: "Probando…" } }));

    let ok = false;
    let texto = "";

    if (a.prueba.directo === "mapbox") {
      // El token es público (VITE_): la llamada va desde el navegador, que es
      // como la usa Mi perfil. Probarla por otro camino no probaría lo mismo.
      const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
      if (!token) {
        texto = "Falta VITE_MAPBOX_TOKEN en el entorno. La credencial del Vault no se usa: el código lee la variable.";
      } else {
        try {
          const r = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/Montevideo.json` +
            `?access_token=${token}&language=es&limit=1`);
          const j = await r.json();
          ok = r.ok && Array.isArray(j?.features);
          texto = ok ? `Respondió bien. ${j.features.length} resultado(s).`
                     : (j?.message ?? `HTTP ${r.status}`);
        } catch (e) {
          texto = e instanceof Error ? e.message : String(e);
        }
      }
    } else {
      const { data, error } = await supabase.functions.invoke(a.prueba.fn!, { body: a.prueba.body! });
      ok = !error;
      // El mensaje crudo, no uno traducido: cuando algo falla, lo que hace
      // falta es lo que dijo el servicio, no nuestra interpretación.
      texto = ok ? `Respondió bien. ${resumir(data)}` : (error?.message ?? "falló sin mensaje");
    }

    setSalida(s => ({ ...s, [a.codigo]: { ok, texto } }));

    if (a.vault_platform) {
      const { error: e2 } = await supabase.rpc("registrar_prueba_de_app", {
        p_plataforma: a.vault_platform, p_ok: ok, p_error: ok ? null : texto,
      });
      if (e2) console.warn("[apps] no se pudo registrar la prueba:", e2.message);
      await traerEstado();
    }
    setProbando(null);
  };

  const cambiar = async (a: AppDelCatalogo,
                         campo: "activa" | "en_sidebar" | "solo_tiendas", valor: boolean) => {
    setOcupado(a.codigo);
    const { error } = await supabase.rpc("actualizar_app", {
      p_codigo: a.codigo,
      [campo === "activa" ? "p_activa"
        : campo === "en_sidebar" ? "p_en_sidebar" : "p_solo_tiendas"]: valor,
    });
    setOcupado(null);
    if (error) { decir(error.message, false); return; }
    olvidarCatalogo();
    await recargar();
    decir(`${a.nombre}: guardado. El menú se actualiza al recargar.`);
  };

  /* ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------
   * LA TABLA
   *
   * Una sola, filtrada por sección. Antes eran tres apiladas, cada una con su
   * encabezado y sus columnas: para comparar una herramienta con una app había
   * que leer dos tablas cuyas columnas no estaban en el mismo lugar.
   *
   * Se declara ANTES del `return`: la barra va arriba en el árbol, así que si
   * esto viviera adentro del JSX los botones no sabrían qué se puede hacer
   * hasta un render después.
   * ---------------------------------------------------------------- */
  const q = busca.trim().toLowerCase();
  const visibles = apps.filter(a =>
    (seccion === "todo" || a.tipo === seccion)
    && (!q || (a.nombre + " " + a.codigo + " " + a.para).toLowerCase().includes(q)));

  /* El estado sólo tiene sentido para herramientas y apps: una funcionalidad
     es una pantalla, no puede fallar sola. Las columnas no se mueven al
     cambiar de sección; esas filas van vacías en vez de con un guion. */
  const conEstado = seccion !== "funcionalidad";

  const columnas: Columna[] = [
    {
      /* Sin ícono y con ancho suficiente para que el nombre entre en UNA línea.
         Los emojis se veían distintos en cada sistema y en dos casos ni
         siquiera se distinguían entre sí; lo que hacían era empujar el nombre
         hasta partirlo en dos renglones, que es lo que de verdad se lee. */
      id: "nombre", label: "Nombre", ancho: 150,
      ver: f => {
        const a = f.app as AppDelCatalogo;
        return (
          <div>
            <div style={{ fontWeight: 700, color: "#111", whiteSpace: "nowrap" }}>
              {a.nombre}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--gray-400)" }}>{a.codigo}</div>
          </div>
        );
      },
    },
    {
      id: "para", label: "Para qué",
      ver: f => {
        const a = f.app as AppDelCatalogo;
        const conError = credsDe(a).find(c => c.ultimo_error);
        const canales = canalesDe(a);
        const out = salida[a.codigo];
        return (
          <div style={{ color: "var(--mute)", fontSize: "0.78rem" }}>
            {a.para}
            {out ? (
              <div style={{ marginTop: 4, fontSize: "0.72rem", borderRadius: 6,
                padding: "0.3rem 0.45rem", wordBreak: "break-word",
                background: out.ok ? "#F0FDF4" : "#FEF2F2",
                color: out.ok ? "#166534" : "#B91C1C" }}>
                {out.texto}
              </div>
            ) : null}
            {conError && !out ? (
              <div style={{ marginTop: 4, fontSize: "0.72rem", borderRadius: 6,
                padding: "0.3rem 0.45rem", background: "#FEF2F2", color: "#B91C1C" }}>
                {conError.ultimo_error}
              </div>
            ) : null}

            {/* Estar instalada no es estar conectada, y con dos canales hay que
                decir CUÁL: "sin cuenta conectada" a secas, con Mercado Libre
                conectado y Mercado Pago no, manda a revisar el que anda. */}
            {canales.filter(x => x.c!.conectadas === 0).map(x => (
              <div key={x.label} style={{ marginTop: 4, fontSize: "0.72rem",
                color: "#B45309", fontWeight: 600 }}>
                {x.label}: sin ninguna cuenta conectada.
              </div>
            ))}
          </div>
        );
      },
    },

    ...(conEstado ? [{
      id: "estado", label: "Estado",
      /* La tabla decide cómo se ve un estado; acá sólo se dice QUÉ pasa. Sin
         esto, cada pantalla elegía su propio rojo. */
      chip: (f: Fila): { tono: Tono; texto: string } | null => {
        const a = f.app as AppDelCatalogo;
        if (a.tipo === "funcionalidad") return null;

        /* Sin plataforma del Vault no hay credencial que tener: no se le
           inventa un estado a algo que no lo tiene. */
        if (a.vault_platforms.length === 0) return { tono: "ok", texto: "INSTALADA" };

        const cs = credsDe(a);
        if (cs.length === 0) return { tono: "atencion", texto: "SIN CREDENCIAL" };

        /* Con varias plataformas manda la peor: una app con Mercado Libre bien
           y Mercado Pago con error no está bien. Y si falta alguna se dice
           cuántas, porque "instalada" con la mitad cargada es la mentira que
           veníamos sacando. */
        if (cs.some(c => c.estado === "error")) return { tono: "error", texto: "CON ERROR" };

        const total = a.vault_platforms.length;
        const enPlataforma = cs.filter(c => c.en_plataforma).length;
        if (enPlataforma === total) return { tono: "ok", texto: "INSTALADA" };
        if (enPlataforma > 0) {
          return { tono: "atencion", texto: `${enPlataforma} DE ${total}` };
        }
        if (cs.some(c => c.en_tiendas > 0)) return { tono: "neutro", texto: "EN TIENDAS" };
        return { tono: "atencion", texto: "SIN CREDENCIAL" };
      },
    } as Columna] : []),

    ...(configurable ? (["activa", "en_sidebar", "solo_tiendas"] as const).map(campo => ({
      id: campo,
      label: campo === "activa" ? "Se ofrece"
           : campo === "en_sidebar" ? "En el menú" : "Sólo tiendas",
      ancho: 82,
      ver: (f: Fila) => {
        const a = f.app as AppDelCatalogo;
        /* Sin ruta no es un lugar: no hay a dónde llevar el menú. */
        const aplica = campo !== "en_sidebar" || !!a.ruta;
        if (!aplica) {
          return <span title="No es un lugar: no tiene pantalla propia."
            style={{ color: "var(--gray-400)", cursor: "help" }}>—</span>;
        }
        return <input type="checkbox" style={{ accentColor: ACCENT }}
          disabled={ocupado !== null}
          checked={(a as unknown as Record<string, boolean>)[campo]}
          onChange={e => { void cambiar(a, campo, e.target.checked); }} />;
      },
    } as Columna)) : []),

    ...(conEstado ? [
      { id: "en_tiendas", label: "En tiendas", numero: true, esUso: true, ancho: 84 },
      /* El rastro a la derecha, siempre. La tabla lo pone al final sola. */
      { id: "actualizada", label: "Actualizada", rastro: true, ancho: 84 },
      { id: "verificada",  label: "Verificada",  rastro: true, ancho: 84 },
    ] as Columna[] : []),
  ];

  const filas: Fila[] = visibles.map(a => {
    const cs = credsDe(a);
    const canales = canalesDe(a);
    return {
      clave: a.codigo,
      nombre: a.nombre,
      /* Con varias plataformas se suma: es "en cuántas se usa", no la de una.
         Y el rastro es el MÁS VIEJO, no el más nuevo: lo que importa de
         "verificada" es hace cuánto que no se comprueba la peor. */
      en_tiendas: canales.length
        ? canales.reduce((n, x) => n + (x.c!.conectadas ?? 0), 0)
        : cs.reduce((n, c) => n + c.en_tiendas, 0),
      actualizada: masVieja(cs.map(c => c.actualizada)),
      verificada:  masVieja(cs.map(c => c.verificada)),
      app: a,
    };
  });

  const nivel = tablas.nivel(NIVEL, {
    columnas, filas,
    nombreDe: f => String(f.nombre),

    /* Doble clic hace lo que corresponda: si es un lugar, se abre; si no lo es
       pero tiene prueba, se prueba. El clic simple sigue ELIGIENDO, y eso no se
       negocia: de la selección dependen las acciones de la barra, así que si el
       clic actuara no habría forma de elegir algo sin ejecutarlo. */
    onAbrir: f => {
      const a = f.app as AppDelCatalogo;
      /* Sin `!configurable`, que era el bug: en CORE Market esta vista ES el
         configurador, así que el doble clic no abría NUNCA. Configurar y usar
         no son excluyentes — el botón "Abrir" de la barra ya funcionaba acá. */
      if (a.ruta) { navegar(a.ruta); return; }
      if (a.prueba && probando === null) void probar(a);
    },
    /* Apagada se ve, no desaparece: si desapareciera de la pantalla que la
       apagó, no habría cómo volver a encenderla. */
    inactiva: f => !(f.app as AppDelCatalogo).activa,
  });

  const marcadas = tablas.seleccionadas(NIVEL);
  const elegidas = filas.filter(f => marcadas.has(f.clave));
  const probables = elegidas
    .map(f => f.app as AppDelCatalogo)
    .filter(a => !!a.prueba);
  const unaSola = elegidas.length === 1 ? elegidas[0].app as AppDelCatalogo : null;

  /* Probar y Abrir no son de la tabla -no crean, no editan, no borran- así que
     van como acciones de la herramienta, a la izquierda de las cuatro. Y están
     siempre: apagadas cuando no corresponde, con el motivo en el tooltip.

     Antes "Probar" era un botón por fila. Con veinte filas, veinte botones que
     hacen lo mismo y ninguna forma de probar dos de una. */
  const acciones: ItemDeBarra[] = [
    {
      label: probando ? "Probando…" : "Probar",
      color: ACCENT, destacado: true,
      desactivada: probando !== null || probables.length === 0,
      motivo: probando ? "Esperá a que termine la prueba en curso"
            : elegidas.length === 0 ? "Elegí una herramienta o app"
            : "Lo elegido no tiene prueba",
      onClick: async () => { for (const a of probables) await probar(a); },
    },
    {
      label: "Abrir",
      desactivada: !(unaSola && unaSola.ruta),
      motivo: elegidas.length === 0 ? "Elegí una fila"
            : elegidas.length > 1   ? "Se abre de a una"
            : "No es un lugar: no tiene pantalla propia",
      onClick: () => { if (unaSola && unaSola.ruta) navegar(unaSola.ruta); },
    },
  ];

  if (cargando) {
    return <div style={{ padding: "3rem", textAlign: "center", color: "var(--gray-400)" }}>Cargando…</div>;
  }

  return (
    /* La barra, el buscador, el aviso y el ancho los define `Pantalla`. */
    <Pantalla p={p}
      /* Las secciones, declaradas UNA vez: se dibujan como botones del menú y
         como selector adentro del buscador. */
      secciones={{
        valor: seccion,
        opciones: [
          { valor: "todo", label: "Todo" },
          ...GRUPOS.map(g => ({ valor: g.tipo, label: g.titulo })),
        ],
        onCambio: setSeccion,
      }}
      extra={acciones}
      buscador={{ valor: busca, onCambio: setBusca }}

      /* De qué se trata, arriba. La nota de la sección se suma cuando hay una:
         en "Todo" no va ninguna, porque serían tres notas sobre una lista que
         justamente las mezcla. */
      explicacion={[
        configurable
          ? "Acá se decide qué se ofrece y cómo se presenta. Lo que EXISTE lo declara el código: una funcionalidad es una pantalla con una ruta, y eso no se puede crear desde un formulario."
          : "",
        GRUPOS.find(g => g.tipo === seccion)?.nota ?? "",
      ].filter(Boolean).join(" · ")}

      notificaciones={sinVerificar === 0 ? [] : [{
        tono: "atencion",
        texto: sinVerificar === 1
          ? "1 nunca se verificó: está cargada, pero nadie comprobó que funcione."
          : sinVerificar + " nunca se verificaron: están cargadas, pero nadie comprobó que funcionen.",
      }]}>

      <Tabla {...nivel} />
    </Pantalla>
  );
}

/** Un resumen corto de lo que devolvió, para saber que trajo algo de verdad. */
function resumir(data: unknown): string {
  if (data == null) return "";
  if (Array.isArray(data)) return `${data.length} resultado(s).`;
  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    for (const k of ["resultados", "items", "results", "data"]) {
      if (Array.isArray(o[k])) return `${(o[k] as unknown[]).length} resultado(s).`;
    }
    const claves = Object.keys(o).slice(0, 3).join(", ");
    return claves ? `Devolvió: ${claves}.` : "";
  }
  return String(data).slice(0, 120);
}

export default CatalogoDeApps;
