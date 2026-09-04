/**
 * Qué ofrece el panel: mitad código, mitad configuración.
 *
 * LA DIVISIÓN, QUE NO ES ARBITRARIA
 *
 *   EL CÓDIGO declara lo que EXISTE. Una funcionalidad es una pantalla con una
 *   ruta; una herramienta es una llamada concreta a un servicio. Eso no se
 *   puede inventar desde un formulario: una fila que apunte a una ruta que
 *   nadie programó es un renglón del menú que lleva a un error.
 *
 *   LA PLATAFORMA declara lo que se OFRECE: cuáles están activas, cómo se
 *   llaman, con qué ícono, en qué orden, cuáles van en el menú y cuáles son
 *   sólo para tiendas. Eso sí es una decisión de negocio, y cambia sin tocar
 *   código ni desplegar.
 *
 * El `codigo` es el contrato entre las dos mitades. Si la base trae un código
 * que acá no existe, se ignora —no hay a dónde llevarlo— y se avisa por
 * consola en vez de dibujar algo roto.
 *
 * DOS VISTAS, UNA LISTA
 * El sidebar muestra lo que se usa para operar; "Herramientas y Apps" muestra
 * todo lo disponible. Salen de acá las dos: con dos listas, agregar algo sería
 * acordarse de dos lugares, y el que se olvida siempre es el mismo.
 */
import { useEffect, useState } from "react";
import { supabase } from "../../../utils/supabase/client";

export type TipoDeApp = "funcionalidad" | "herramienta" | "app";

/**
 * Una prueba segura: chica, de sólo lectura, y real.
 *
 * `fn` va por una función del servidor. `directo` es para las que se llaman
 * desde el navegador con un token público, como Mapbox: pasarlas por el
 * servidor no agregaría seguridad y sí un intermediario que puede fallar por
 * su cuenta y confundir el diagnóstico.
 */
export type Prueba =
  | { fn: string; body: Record<string, unknown>; directo?: never }
  | { directo: "mapbox"; fn?: never; body?: never };

/* ---------------------------------------------------------------------- *
 * Lo que existe. Esto es código y no se configura.
 * ---------------------------------------------------------------------- */

/** A dónde lleva cada funcionalidad. Sin ruta, no es un lugar. */
export const RUTAS: Record<string, string> = {
  biblioteca:    "/admin/biblioteca",
  publicaciones: "/admin/publicaciones",
  pedidos:       "/admin/orders",
  editor:        "/admin/editor",
  // Es `tool-editor` del monorepo, copiado en `src/lib/`. Su descripción real
  // es "editor de imágenes profesional" — no edita la vidriera.
  editorpro:     "/admin/tool-editor",
  vault:         "/admin/api-vault",
  /* El perfil es de la PERSONA, no de la tienda. Se abre con el lápiz de la
     ficha de arriba a la izquierda; no va al menú, que sería tenerlo en dos
     lugares. */
  perfil:        "/admin/profile",
  // Instagram, Facebook y WhatsApp en una pantalla. Lee del API Vault.
  meta:          "/admin/meta",
  /* Mercado Libre y Mercado Pago llevan a la MISMA pantalla, porque son la
     misma conexión: un solo login de Mercado Libre, una sola app de
     desarrollador, y `ml-oauth` las atiende a las dos con un parámetro.
     Sin estas dos líneas el botón "Abrir" quedaba apagado para siempre y no
     había forma de llegar a la pantalla desde acá. */
  /* ML & MP es UNA entrada: mismo login, misma app de desarrollador, misma
     pantalla. Eran dos filas del catálogo hasta que se juntaron. */
  ml:            "/admin/ml",
  /* `analytics` NO va acá hasta que exista la pantalla. Estuvo declarada con
     ruta y sin `AdminAnalytics` detrás: apretar "Abrir" llevaba a una pantalla
     en blanco. La fila del catálogo queda apagada, que es donde se ve que
     falta. Lo controla `scripts/check-rutas.mjs`. */
  // Lo que administra CORE Market. Son rutas propias, no secciones de una
  // pantalla: se llega desde el menú, no desde una barra adentro del Dashboard.
  tiendas:       "/admin/tiendas",
  // La misma informacion que Tiendas, mirada al reves: una persona y en que
  // tiendas esta. Es la que hace falta cuando alguien dice "no puedo entrar".
  personas:      "/admin/personas",
  /* "mio" y no un id: la pantalla resuelve en cuál estoy trabajando. Con el id
     en el menú, el enlace quedaría viejo apenas se cambie de vendedor. */
  mi_vendedor:   "/admin/tiendas/mio",
  definiciones:  "/admin/definiciones",
};

/** Cómo se prueba cada herramienta. Sin entrada acá, no se puede probar. */
export const PRUEBAS: Record<string, Prueba> = {
  serper: { fn: "buscar-web", body: { q: "core market prueba", tipo: "web", num: 1 } },
  // Traer la cotización de nuevo no rompe nada: reescribe la del día.
  bcu:    { fn: "tipo-de-cambio", body: {} },
  mapbox: { directo: "mapbox" },
};

/** Por qué algunas no se pueden probar. Decirlo es mejor que un botón que miente. */
export const SIN_PRUEBA: Record<string, string> = {
  // Publicar publicaría de verdad, y probar un cobro es cobrar. Son una sola
  // fila desde que ML y MP se juntaron: es una sola conexión.
  ml: "Publicar publicaría de verdad, y probar un cobro es cobrar.",
  // Meta SÍ se prueba, pero desde su propia pantalla: son tres plataformas con
  // tres credenciales distintas, y probarlas de a una es lo único que dice cuál
  // falla. Un botón acá tendría que elegir una o mentir con un solo resultado.
  meta: "Se prueba adentro: cada plataforma tiene su credencial y su resultado.",
};

/* ---------------------------------------------------------------------- *
 * Lo que se ofrece. Esto viene de la base.
 * ---------------------------------------------------------------------- */

export interface AppDelCatalogo {
  codigo: string;
  tipo: TipoDeApp;
  nombre: string;
  icono: string | null;
  para: string | null;
  orden: number;
  en_sidebar: boolean;
  solo_tiendas: boolean;
  /** Sólo CORE Market: el espejo de `solo_tiendas`. */
  solo_plataforma: boolean;
  /** El grupo del menú lateral. En null, va suelta arriba. */
  seccion: string | null;
  vault_platform: string | null;
  /**
   * Todas las plataformas del Vault que toca.
   *
   * Una app puede tocar varias: ML & MP son dos —publicar y cobrar— y Meta son
   * tres. Con una sola columna, la fila mostraba el estado de una y callaba el
   * de las otras: Meta decía sólo lo de Instagram.
   */
  vault_platforms: string[];
  /** Si se ofrece. Al pedir `todas`, acá vienen también las apagadas. */
  activa: boolean;
  /** Resuelta desde `RUTAS`. Null en herramientas y apps: no son lugares. */
  ruta: string | null;
  prueba: Prueba | null;
  sinPrueba: string | null;
}

/*
 * Una sola lectura por sesión, compartida.
 *
 * La consultan el sidebar y la pantalla de Herramientas y Apps, y en el
 * sidebar ocurre en cada render. Sin esto serían dos consultas para lo mismo,
 * y dos respuestas que pueden llegar distintas si alguien configura algo en el
 * medio: el menú diría una cosa y el catálogo otra.
 */
const pedido: Record<string, Promise<AppDelCatalogo[]> | null> = { si: null, no: null };

async function traer(todas: boolean): Promise<AppDelCatalogo[]> {
  const { data, error } = await supabase.rpc("catalogo_de_apps", { p_todas: todas });
  if (error) {
    console.warn("[apps] no se pudo leer el catálogo:", error.message);
    return [];
  }
  return (data ?? []).flatMap((r: Record<string, unknown>) => {
    const codigo = String(r.codigo);
    const tipo   = String(r.tipo) as TipoDeApp;
    const ruta   = RUTAS[codigo] ?? null;

    // Una funcionalidad sin ruta no se puede mostrar: sería un renglón del
    // menú que no lleva a ningún lado. Se avisa, porque es un desajuste entre
    // la base y el código que alguien tiene que arreglar.
    if (tipo === "funcionalidad" && !ruta) {
      console.warn(`[apps] "${codigo}" está en el catálogo pero no tiene ruta en el código.`);
      return [];
    }

    return [{
      codigo, tipo,
      nombre: String(r.nombre),
      icono:  (r.icono as string) ?? null,
      para:   (r.para as string) ?? null,
      orden:  Number(r.orden ?? 100),
      en_sidebar:   !!r.en_sidebar,
      solo_tiendas: !!r.solo_tiendas,
      solo_plataforma: !!r.solo_plataforma,
      seccion: (r.seccion as string) ?? null,
      vault_platform: (r.vault_platform as string) ?? null,
      /* Si la base no trae la lista, vale la de siempre: una sola. */
      vault_platforms: (r.vault_platforms as string[])
        ?? ((r.vault_platform as string) ? [r.vault_platform as string] : []),
      activa: r.activa !== false,
      ruta,
      prueba:    PRUEBAS[codigo] ?? null,
      sinPrueba: SIN_PRUEBA[codigo] ?? null,
    }];
  });
}

/** Vuelve a leer. Se llama después de configurar algo. */
export function olvidarCatalogo() { pedido.si = null; pedido.no = null; }

/**
 * @param todas incluye las apagadas. Sólo la plataforma puede pedirlo: para
 * una tienda, "apagada" quiere decir "no existe".
 */
export function useCatalogoDeApps(todas = false) {
  const [apps, setApps] = useState<AppDelCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const clave = todas ? "si" : "no";

  useEffect(() => {
    let vivo = true;
    pedido[clave] = pedido[clave] ?? traer(todas);
    pedido[clave]!.then(a => { if (vivo) { setApps(a); setCargando(false); } });
    return () => { vivo = false; };
  }, [clave, todas]);

  return {
    apps,
    cargando,
    funcionalidades: apps.filter(a => a.tipo === "funcionalidad"),
    herramientas:    apps.filter(a => a.tipo === "herramienta"),
    integraciones:   apps.filter(a => a.tipo === "app"),
    /** Lo que va en el menú: lo de operar, no el catálogo entero. */
    deSidebar: apps.filter(a => a.en_sidebar && a.ruta),
    recargar: async () => {
      olvidarCatalogo();
      pedido[clave] = traer(todas);
      setApps(await pedido[clave]!);
    },
  };
}
