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

async function invocar(fn: string, body: Record<string, unknown>) {
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
