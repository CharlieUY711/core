/**
 * Registro de motores de sincronización por canal.
 *
 * DEFINICIÓN DE DISEÑO
 * La lista de publicaciones no conoce ningún canal en particular. Conoce un
 * contrato: un canal puede tener un motor, y un motor sabe hacer dos cosas —
 * decir qué falta antes de publicar, y publicar. Sumar un canal es registrar
 * un motor más; ni la tabla, ni los chips, ni el botón Sincronizar cambian.
 *
 * Por eso el contrato no habla en el vocabulario de ningún proveedor:
 *
 *   * `verificar` devuelve campos del catálogo, no campos de una API ajena.
 *   * `publicar` devuelve un motivo ya redactado para quien vende. Traducir la
 *     jerga del canal es responsabilidad del motor, no de quien la muestra: si
 *     la pantalla tuviera que interpretarla, tendría que aprender el
 *     vocabulario de cada proveedor que se agregue.
 *
 * Y un canal se ofrece sólo cuando su motor está operativo: configurado y con
 * credenciales vigentes. Mostrar un destino al que no se puede publicar no le
 * da una opción a nadie, le da un error diferido. Por eso `disponible()` es
 * parte del contrato y no un detalle de cada implementación.
 */
import { supabase } from "../../../utils/supabase/client";
import { traducirErrorMl, etiquetaDeCampo } from "./mlErrores";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY      = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

/** Algo que falta en el catálogo para poder publicar. */
export interface ProblemaPublicacion {
  /** Campo editable: title | price | stock | pictures | category_id | attr:… */
  campo: string;
  etiqueta: string;
  /** Redactado para quien vende, no para quien programó la integración. */
  mensaje: string;
  /**
   * Valores que el canal acepta. Vacío o ausente = texto libre.
   *
   * Viajan con el problema para que se pueda corregir en el mismo lugar donde
   * se informa: mandar a alguien a otra pantalla a adivinar qué valor acepta
   * una categoría es la mitad del trabajo.
   */
  opciones?: string[];
  /** Lo cargado hoy, para no volver a pedir lo que ya está. */
  valor?: string | null;
  /** Pista de control: number, boolean, string… */
  tipo?: string;
  /**
   * Cómo se completa bien ese campo, según el canal.
   *
   * Decir "el título no cumple las reglas" y no decir cuáles son deja a la
   * persona probando de a una. Las reglas las pone el canal, así que las
   * declara su motor.
   */
  ayuda?: string[];
  /** Largo máximo, si el canal lo impone. Se muestra como contador. */
  maxLargo?: number;
}

export interface ResultadoSync {
  ok: boolean;
  /** Qué pasó, en una línea. Sólo cuando ok es false. */
  motivo?: string;
  /** Qué hacer al respecto, si se puede saber. */
  accion?: string;
  /** Respuesta original del canal. Nunca se oculta, nunca se muestra sola. */
  crudo?: string;
  /**
   * Qué hay que corregir, en la MISMA forma que devuelve `verificar`.
   *
   * Un rechazo al publicar y un faltante detectado antes son el mismo problema
   * visto en dos momentos, y tienen que terminar en el mismo formulario, con
   * el mismo campo editable. Devolver el rechazo como un texto suelto obligaba
   * a leer un aviso, deducir qué campo era y buscarlo en otra parte.
   */
  problemas?: ProblemaPublicacion[];
}

/** Como se vende hoy ese producto en ese canal. */
export interface MercadoCanal {
  /** Precio mas bajo, mediana y mas alto entre las ofertas activas. */
  min: number; mediana: number; max: number;
  moneda: string;
  /** Cuantas ofertas del mismo producto hay. */
  ofertas: number;
  /** Las mas baratas primero. Sin identificar a nadie. */
  competencia: Array<{
    precio: number; moneda: string; envioGratis: boolean;
    vendidos: number; condicion: string; ganaLaCompra: boolean;
  }>;
}

/** Una version concreta del producto, tal como la conoce un canal. */
export interface ProductoEncontrado {
  id: string;
  nombre: string;
  imagen: string | null;
  /** Lo que la distingue de otra version: capacidad, color, modelo. */
  rasgos: string[];
  /** De que canal salio. Se muestra: no es lo mismo de donde viene el dato. */
  canal: string;
  canalNombre: string;
}

/** Datos del producto que el canal ya tiene cargados. */
export interface FichaCanal {
  productoId: string | null;
  nombre: string | null;
  atributos: Array<{ id: string; valor: string }>;
  imagenes: string[];
  caracteristicas: string[];
  descripcion: string | null;
  /** Descripcion ampliada armada con lo que el canal ya sabe. Se sugiere. */
  descripcionSugerida: string | null;
  /** Puntos para usar al vender: caracteristicas y contexto de mercado. */
  argumentosDeVenta: string[];
  mercado: MercadoCanal | null;
  /**
   * Por que no hay datos de mercado, cuando no los hay.
   *
   * "Sin datos" a secas no deja distinguir un producto que nadie mas vende de
   * una consulta que fallo, y son cosas distintas: la primera es informacion,
   * la segunda es un problema.
   */
  mercadoMotivo: string | null;
  /**
   * Categoria de Mercado Libre que el canal predice para el titulo, con el
   * camino completo hasta ella (de la raiz a la hoja).
   *
   * Es la categoria QUE USA ML, no la nuestra: nuestro departamento /
   * categoria / subcategoria son una taxonomia propia y no tienen por que
   * coincidir en id. Sirve como pista para adivinarlos por nombre, no como
   * un valor que se pueda guardar directo.
   */
  categoriaSugerida: { id: string; nombre: string; path: string[] } | null;
}

export interface MotorCanal {
  /** Nombre visible del canal, para los avisos. */
  nombre: string;
  /**
   * ¿Está en condiciones de publicar ahora?
   *
   * No es "existe el código": es que el módulo esté configurado y con
   * credenciales vigentes. Mientras devuelva false el canal no se ofrece.
   */
  disponible(): Promise<{ ok: boolean; motivo?: string }>;
  /** Qué falta para poder publicar. Lista vacía = está listo. */
  verificar(variantId: string): Promise<ProblemaPublicacion[]>;
  /** Publica o actualiza. */
  publicar(variantId: string): Promise<ResultadoSync>;
  /**
   * Lo que el canal ya sabe del producto: atributos, fotos del fabricante,
   * caracteristicas y a que precio se vende hoy.
   *
   * Un codigo de producto o una foto de fabricante no son datos de quien
   * vende: son del producto. Un motor que pueda averiguarlos evita pedirlos.
   * Devolver null es valido: significa que ese canal no tiene de donde.
   */
  ficha?(variantId: string): Promise<FichaCanal | null>;
  /**
   * Versiones del producto que este canal conoce, para un texto.
   *
   * Cada canal tiene su catalogo y ninguno los tiene todos: uno puede conocer
   * una version que el otro no. Por eso se pregunta a todos y se junta, en vez
   * de elegir una fuente y confiar en que alcanza.
   */
  buscarProductos?(texto: string): Promise<ProductoEncontrado[]>;
  /**
   * Guarda una corrección de las que `verificar` pidió.
   *
   * El motor sabe dónde vive cada campo: unos son del catálogo y otros son
   * atributos que sólo tienen sentido para ese canal. Quien muestra el
   * formulario no tiene por qué saberlo.
   */
  corregir(variantId: string, campo: string, valor: string): Promise<{ ok: boolean; motivo?: string }>;
}

// ─── Un motor concreto ─────────────────────────────────────────────────────
// Habla con la Edge Function que conoce los requisitos de ese canal y que es
// la que impide que salga algo incompleto. La verificación no se reimplementa
// acá: dos copias de las mismas reglas terminan diciendo cosas distintas.

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return `Bearer ${session?.access_token ?? ANON_KEY}`;
}

export async function invocar(fn: string, body: Record<string, unknown>) {
  const res = await fetch(`${FUNCTIONS_URL}/${fn}`, {
    method:  "POST",
    headers: { Authorization: await authHeader(), "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  return res.json();
}

/**
 * Reglas de Mercado Libre para escribir un título, tal como las publica.
 *
 * Viven en el motor y no en la pantalla: son de este canal y de ningún otro.
 * Otro canal traerá las suyas y la pantalla las mostrará igual sin conocerlas.
 */
const AYUDA_ML: Record<string, string[]> = {
  title: [
    "Formato que recomienda Mercado Libre: producto + marca + modelo + algo que lo distinga. Por ejemplo: «Celular Apple iPhone 17 256 GB».",
    "Hasta 60 caracteres.",
    "Sin datos de contacto, links ni precios.",
    "Sin palabras promocionales: oferta, descuento, envío gratis, liquidación.",
    "Sin mayúsculas sostenidas ni signos repetidos (!!!, ***).",
    "Sin condiciones de venta ni información de envío.",
  ],
  price: [
    "Tiene que ser mayor que cero y estar dentro del rango que admite la categoría.",
  ],
  pictures: [
    "Al menos una imagen, accesible públicamente.",
    "Fondo blanco y sin textos ni logos superpuestos en la principal.",
  ],
  category_id: [
    "Tiene que ser una categoría final, no una que agrupe otras.",
    "La categoría define qué atributos son obligatorios: cambiarla cambia lo que se pide.",
  ],
};

const MAX_LARGO_ML: Record<string, number> = { title: 60 };

/** Suma a cada problema las reglas del canal para ese campo. */
const conAyudaMl = (ps: ProblemaPublicacion[]): ProblemaPublicacion[] =>
  ps.map((p) => ({
    ...p,
    ayuda:    p.ayuda    ?? AYUDA_ML[p.campo],
    maxLargo: p.maxLargo ?? MAX_LARGO_ML[p.campo],
  }));

const motorMercadoLibre: MotorCanal = {
  nombre: "Mercado Libre",

  async disponible() {
    try {
      const url = new URL(`${FUNCTIONS_URL}/ml-oauth`);
      url.searchParams.set("action", "status");
      const res = await fetch(url.toString(), {
        headers: { Authorization: await authHeader(), "Content-Type": "application/json" },
      });
      const d = await res.json();
      const creds = Array.isArray(d?.credentials) ? d.credentials : [];
      const viva = creds.find((c: any) => c?.platform === "MercadoLibre" && !c?.isExpired);
      if (!viva) {
        return {
          ok: false,
          motivo: creds.some((c: any) => c?.platform === "MercadoLibre")
            ? "La sesión de Mercado Libre venció. Reconectá la cuenta."
            : "No hay ninguna cuenta de Mercado Libre conectada.",
        };
      }
      return { ok: true };
    } catch (_) {
      return { ok: false, motivo: "No se pudo consultar el estado de la cuenta." };
    }
  },

  async verificar(variantId) {
    try {
      const d = await invocar("publicar-en-ml", { variantId, soloVerificar: true });
      return conAyudaMl(Array.isArray(d?.problemas) ? d.problemas : []);
    } catch (_) {
      // No poder verificar no es lo mismo que no faltar nada, pero bloquear la
      // pantalla por una consulta caída es peor: se deja publicar y que el
      // canal responda.
      return [];
    }
  },

  async corregir(variantId, campo, valor) {
    const v = valor.trim();
    // Atributo propio del canal: vive en el listing, no en el catálogo.
    if (campo.startsWith("attr:")) {
      const id = campo.slice(5);
      const { data: fila, error: e1 } = await supabase
        .from("catalog_listings")
        .select("id, channel_attrs")
        .eq("variant_id", variantId).eq("channel", "mercadolibre").maybeSingle();
      if (e1)   return { ok: false, motivo: e1.message };
      if (!fila) return { ok: false, motivo: "El producto todavía no está asignado a este canal." };

      const attrs: any = { ...(fila.channel_attrs ?? {}) };
      const previos: any[] = Array.isArray(attrs.extra_attributes) ? attrs.extra_attributes : [];
      const resto = previos.filter((a) => a?.id !== id);
      attrs.extra_attributes = v ? [...resto, { id, value_name: v }] : resto;

      const { error: e2 } = await supabase
        .from("catalog_listings").update({ channel_attrs: attrs }).eq("id", fila.id);
      return e2 ? { ok: false, motivo: e2.message } : { ok: true };
    }

    if (campo === "category_id") {
      const { data: fila, error: e1 } = await supabase
        .from("catalog_listings")
        .select("id, channel_attrs")
        .eq("variant_id", variantId).eq("channel", "mercadolibre").maybeSingle();
      if (e1)    return { ok: false, motivo: e1.message };
      if (!fila) return { ok: false, motivo: "El producto todavía no está asignado a este canal." };
      const attrs: any = { ...(fila.channel_attrs ?? {}), category_id: v, category_id_origen: "manual" };
      const { error: e2 } = await supabase
        .from("catalog_listings").update({ channel_attrs: attrs }).eq("id", fila.id);
      return e2 ? { ok: false, motivo: e2.message } : { ok: true };
    }

    // Campos del catálogo: van por el mismo RPC que usa el editor.
    const patch: Record<string, unknown> = { p_variant_id: variantId };
    if (campo === "title") patch.p_title = v;
    if (campo === "price") {
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) return { ok: false, motivo: "El precio tiene que ser mayor que cero." };
      patch.p_price = n;
    }
    if (campo === "stock") {
      const n = parseInt(v, 10);
      if (!Number.isFinite(n) || n < 0) return { ok: false, motivo: "El stock no puede ser negativo." };
      patch.p_stock = n;
    }
    if (Object.keys(patch).length === 1) return { ok: false, motivo: `No sé cómo guardar "${campo}".` };

    const { error } = await supabase.rpc("actualizar_publicacion", patch);
    return error ? { ok: false, motivo: error.message } : { ok: true };
  },

  async buscarProductos(texto) {
    try {
      const d = await invocar("publicar-en-ml", { soloEnriquecer: true, titulo: texto });
      return (Array.isArray(d?.candidatos) ? d.candidatos : []).map((c: any) => ({
        id: String(c.id), nombre: String(c.nombre),
        imagen: c.imagen ?? null,
        rasgos: Array.isArray(c.rasgos) ? c.rasgos : [],
        canal: "mercadolibre", canalNombre: "Mercado Libre",
      }));
    } catch (_) {
      return [];
    }
  },

  async ficha(variantId) {
    try {
      const d = await invocar("publicar-en-ml", { variantId, soloEnriquecer: true });
      if (!d?.ok || !d?.encontrado) return null;
      const p = d.precios;
      return {
        productoId:      d.producto?.id ?? null,
        nombre:          d.producto?.nombre ?? null,
        atributos:       Array.isArray(d.atributos) ? d.atributos : [],
        imagenes:        Array.isArray(d.imagenes) ? d.imagenes : [],
        caracteristicas: Array.isArray(d.caracteristicas) ? d.caracteristicas : [],
        descripcion:     d.descripcion ?? null,
        descripcionSugerida: d.descripcionSugerida ?? null,
        argumentosDeVenta:   Array.isArray(d.argumentosDeVenta) ? d.argumentosDeVenta : [],
        mercado: p ? {
          min: Number(p.min) || 0, mediana: Number(p.mediana) || 0, max: Number(p.max) || 0,
          moneda: String(p.moneda ?? ""), ofertas: Number(p.ofertas) || 0,
          competencia: Array.isArray(d.competencia) ? d.competencia : [],
        } : null,
        mercadoMotivo: d.mercadoMotivo ?? null,
        // Este método consulta por variantId (producto ya existente); la
        // predicción de categoría sólo se calcula al buscar por título, que
        // es el caso de uso del alta (ver fichaPorTitulo más abajo).
        categoriaSugerida: null,
      };
    } catch (_) {
      return null;
    }
  },

  async publicar(variantId) {
    const r = await invocar("publicar-en-ml", { variantId });
    if (r?.ok) return { ok: true };
    // La jerga del proveedor se traduce acá y no en la pantalla, y se convierte
    // en los campos a corregir para que el rechazo entre por el mismo lugar
    // que un faltante.
    const t = traducirErrorMl(r);
    return {
      ok: false,
      motivo: t.motivo,
      accion: t.accion ?? undefined,
      crudo:  t.crudo,
      problemas: conAyudaMl(t.campos.map((campo) => ({
        campo,
        etiqueta: etiquetaDeCampo(campo),
        mensaje:  t.detalle,
      }))),
    };
  },
};

// ─── Registro ──────────────────────────────────────────────────────────────

const MOTORES: Record<string, MotorCanal> = {
  mercadolibre: motorMercadoLibre,
};

export const motorDe = (channel: string): MotorCanal | null => MOTORES[channel] ?? null;

export interface CanalDisponible { channel: string; nombre: string }

/**
 * Canales que se pueden ofrecer ahora mismo.
 *
 * Se pregunta a cada motor en vez de mirar una lista: un canal deja de estar
 * disponible en cuanto su credencial vence, sin que cambie nada del codigo.
 * Los motivos de los que no estan se devuelven aparte, para poder explicar por
 * que no aparecen en lugar de que simplemente falten.
 */
export async function canalesDisponibles(): Promise<{
  disponibles: CanalDisponible[];
  bloqueados: Array<{ channel: string; nombre: string; motivo: string }>;
}> {
  const entradas = Object.entries(MOTORES);
  const estados = await Promise.all(
    entradas.map(async ([channel, motor]) => ({
      channel, motor, estado: await motor.disponible(),
    })),
  );
  return {
    disponibles: estados.filter((e) => e.estado.ok)
      .map((e) => ({ channel: e.channel, nombre: e.motor.nombre })),
    bloqueados: estados.filter((e) => !e.estado.ok)
      .map((e) => ({ channel: e.channel, nombre: e.motor.nombre,
                     motivo: e.estado.motivo ?? "No está configurado" })),
  };
}

/**
 * Ficha del producto a partir del titulo, sin que exista todavia.
 *
 * Es el caso del alta: quien carga un articulo escribe el titulo y ahi mismo
 * se puede traer todo lo demas. Esperar a que exista la variante llega tarde,
 * porque para entonces ya escribio a mano lo que podiamos buscar.
 */
/**
 * Solo la clasificacion: en que departamento y categoria cae este titulo.
 *
 * Es lo unico que le pedimos a Mercado Libre sobre el articulo -eso y la
 * competencia-; el producto en si sale del fabricante.
 *
 * VA APARTE DE `fichaPorTitulo` A PROPOSITO
 * Aquella devuelve null cuando ML no encuentra el producto en SU catalogo, y
 * ahi se perdia la categoria sugerida, que el motor devuelve igual: ML sabe
 * clasificar "Aceite de oliva extra virgen 500ml" aunque no tenga ese producto
 * publicado. Casi todas las marcas chicas caen en ese caso, o sea justo las que
 * mas necesitan que les adivinemos el departamento.
 */
export async function categoriaSugeridaDe(
  titulo: string, channel = "mercadolibre",
): Promise<{ id: string; nombre: string; path: string[] } | null> {
  if (titulo.trim().length < 4) return null;
  if (!motorDe(channel)) return null;
  try {
    const d = await invocar("publicar-en-ml", { soloEnriquecer: true, titulo });
    const c = d?.categoriaSugerida;
    if (!c) return null;
    return {
      id: String(c.id),
      nombre: String(c.nombre ?? ""),
      path: Array.isArray(c.path) ? c.path : [],
    };
  } catch (_) {
    return null;
  }
}

export async function fichaPorTitulo(
  titulo: string, channel = "mercadolibre", productoId?: string,
): Promise<FichaCanal | null> {
  if (!productoId && titulo.trim().length < 4) return null;
  const motor = motorDe(channel);
  if (!motor) return null;
  try {
    const d = await invocar("publicar-en-ml",
      productoId ? { soloEnriquecer: true, productoId } : { soloEnriquecer: true, titulo });
    if (!d?.ok || !d?.encontrado) return null;
    const p = d.precios;
    return {
      productoId:      d.producto?.id ?? null,
      nombre:          d.producto?.nombre ?? null,
      atributos:       Array.isArray(d.atributos) ? d.atributos : [],
      imagenes:        Array.isArray(d.imagenes) ? d.imagenes : [],
      caracteristicas: Array.isArray(d.caracteristicas) ? d.caracteristicas : [],
      descripcion:     d.descripcion ?? null,
      descripcionSugerida: d.descripcionSugerida ?? null,
      argumentosDeVenta:   Array.isArray(d.argumentosDeVenta) ? d.argumentosDeVenta : [],
      mercado: p ? {
        min: Number(p.min) || 0, mediana: Number(p.mediana) || 0, max: Number(p.max) || 0,
        moneda: String(p.moneda ?? ""), ofertas: Number(p.ofertas) || 0,
        competencia: Array.isArray(d.competencia) ? d.competencia : [],
      } : null,
      mercadoMotivo: d.mercadoMotivo ?? null,
      categoriaSugerida: d.categoriaSugerida
        ? { id: String(d.categoriaSugerida.id), nombre: String(d.categoriaSugerida.nombre ?? ""),
            path: Array.isArray(d.categoriaSugerida.path) ? d.categoriaSugerida.path : [] }
        : null,
    };
  } catch (_) {
    return null;
  }
}

/**
 * Versiones del producto que el canal conoce, para elegir cual es.
 *
 * Un titulo como "iPhone 17" no identifica un producto: son varios. Elegir por
 * el primero seria decidir por quien vende algo que solo el sabe.
 */
export async function buscarProductos(texto: string): Promise<ProductoEncontrado[]> {
  if (texto.trim().length < 4) return [];

  // A todos los canales que sepan buscar, en paralelo. Ninguno tiene el
  // catalogo completo, y limitarse a uno es quedarse con lo que ese sepa.
  const motores = Object.entries(MOTORES).filter(([, m]) => m.buscarProductos);
  const listas = await Promise.all(motores.map(async ([, m]) => {
    try { return await m.buscarProductos!(texto); } catch (_) { return []; }
  }));

  // El mismo producto puede aparecer en dos canales. Se junta por nombre para
  // no mostrarlo dos veces, conservando de que canales vino.
  const porNombre = new Map<string, ProductoEncontrado>();
  for (const p of listas.flat()) {
    const clave = p.nombre.toLowerCase().replace(/\s+/g, " ").trim();
    const previo = porNombre.get(clave);
    if (!previo) { porNombre.set(clave, p); continue; }
    if (!previo.canalNombre.includes(p.canalNombre)) {
      previo.canalNombre = previo.canalNombre + " · " + p.canalNombre;
    }
    if (!previo.imagen && p.imagen) previo.imagen = p.imagen;
  }
  return [...porNombre.values()].slice(0, 12);
}

/**
 * Ficha del producto en cada canal disponible, en paralelo.
 *
 * Se pregunta a todos y se devuelve lo que cada uno sepa: comparar el precio de
 * mercado entre canales es justamente lo que permite decidir con que numero
 * salir en cada uno. Un canal que no tenga de donde sacarlo devuelve null y no
 * aparece en la comparativa, pero su precio se puede fijar igual.
 */
export async function fichasDeCanales(
  variantId: string, canales: string[],
): Promise<Record<string, FichaCanal | null>> {
  const pares = await Promise.all(canales.map(async (channel) => {
    const motor = motorDe(channel);
    if (!motor?.ficha) return [channel, null] as const;
    try { return [channel, await motor.ficha(variantId)] as const; }
    catch (_) { return [channel, null] as const; }
  }));
  return Object.fromEntries(pares);
}

/** Guarda una corrección en el canal que la pidió. */
export async function corregirCampo(
  variantId: string, channel: string, campo: string, valor: string,
): Promise<{ ok: boolean; motivo?: string }> {
  const motor = motorDe(channel);
  if (!motor) return { ok: false, motivo: `El canal "${channel}" no tiene módulo de sincronización.` };
  return motor.corregir(variantId, campo, valor);
}

/** Qué falta para publicar ahí. Sin motor no hay requisitos que pedir. */
export async function verificarCanal(
  variantId: string, channel: string,
): Promise<ProblemaPublicacion[]> {
  const motor = motorDe(channel);
  return motor ? motor.verificar(variantId) : [];
}

/**
 * Habilita el canal si hacía falta y publica.
 *
 * Elegir un canal y sincronizar es la forma de publicar en él: pedir primero
 * "activar el canal" y después "sincronizar" son dos pasos para un solo
 * resultado buscado.
 */
export async function sincronizarCanal(variantId: string, channel: string): Promise<ResultadoSync> {
  const motor = motorDe(channel);
  // No deberia poder elegirse un canal sin motor, porque no se ofrece. Si
  // llega uno igual, se dice; activarlo en el catalogo sin poder publicarlo
  // dejaria el articulo diciendo que esta en un lado donde no esta.
  if (!motor) return { ok: false, motivo: `El canal "${channel}" no tiene módulo de sincronización.` };

  const { error } = await supabase.rpc("toggle_canal_publicacion", {
    p_variant_id: variantId, p_channel: channel, p_activo: true,
  });
  if (error) return { ok: false, motivo: error.message };

  return motor.publicar(variantId);
}
