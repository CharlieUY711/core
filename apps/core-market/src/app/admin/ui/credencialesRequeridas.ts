/**
 * Las credenciales que el sistema lee, con su nombre exacto.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POR QUÉ ESTO EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * El código busca por nombre exacto: `useMetaVault` pide `INSTAGRAM_ACCESS_TOKEN`
 * y la función de conexión pide `META_APP_ID`. Un nombre distinto no es un
 * nombre parecido: es que no existe.
 *
 * Y eso pasó. Alguien cargó "META App ID" desde el formulario, con el valor
 * correcto, y el sistema no la encontró nunca. No falló nada: quedó una
 * credencial cargada que no lee nadie, y una pantalla diciendo que faltaba
 * justo eso que estaba ahí.
 *
 * Escribir un nombre exacto de memoria es un requisito imposible de cumplir de
 * forma confiable. Con esta lista, el formulario los ofrece y no hay nada que
 * escribir.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DOS CLASES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   A MANO      Se pega una clave que dio otro sistema.
 *   POR BOTÓN   Las escribe el flujo de conexión. Cargarlas a mano no está
 *               prohibido, pero es hacer a mano lo que ya hace un botón — y la
 *               próxima conexión las pisa.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * Y DOS FORMAS DE ENCONTRARLAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   POR NOMBRE      `useMetaVault` pide `INSTAGRAM_ACCESS_TOKEN` exacto. Un
 *                   nombre distinto es una credencial que no existe.
 *   POR PLATAFORMA  `buscar-web` pide "la de Serper.dev que sea api_key", sin
 *                   mirar el nombre. Ahí el nombre es para el humano.
 *
 * La diferencia importa porque de ella depende si un nombre distinto rompe algo.
 * Dar por hecho que todas se buscan por nombre hizo que apareciera "No la lee
 * nadie" sobre la clave de Serper, que se lee perfectamente.
 */
import type { VaultType } from "../services/apiVaultTypes";

export interface CredencialRequerida {
  /** El nombre EXACTO con el que el código la busca. */
  name: string;
  platform: string;
  /** Cómo se llama para una persona. */
  etiqueta: string;
  /** Quién la usa y para qué. */
  para: string;
  tipo: VaultType;
  /**
   * El navegador no puede leerla nunca. Para las que comprometen el sistema si
   * llegan al cliente.
   */
  soloServidor?: boolean;
  /** Las escribe el botón Conectar. */
  porBoton?: boolean;
  /**
   * Cómo la encuentra el código.
   *
   * `plataforma` significa que el nombre da igual: se busca por plataforma y
   * tipo. Es la diferencia entre que un nombre distinto rompa algo o no.
   */
  seBusca: "nombre" | "plataforma";
  /** Qué forma tiene. Se avisa antes de guardar. */
  revisar?: (v: string) => string | null;
}

const soloNumeros = (v: string) =>
  /^\d+$/.test(v.trim()) ? null : "Tiene que ser sólo números, sin espacios.";

export const REQUERIDAS: CredencialRequerida[] = [
  /* ── Meta: la app de la plataforma ─────────────────────────────────── */
  {
    name: "META_APP_ID", seBusca: "nombre", platform: "Meta", tipo: "api_key", soloServidor: true,
    etiqueta: "Identificador de la app",
    para: "Con qué app de Meta se conectan todas las tiendas.",
    revisar: soloNumeros,
  },
  {
    name: "META_APP_SECRET", seBusca: "nombre", platform: "Meta", tipo: "secret", soloServidor: true,
    etiqueta: "Clave secreta de la app",
    para: "Prueba que la conexión viene de nosotros. No sale nunca al navegador.",
  },

  {
    /* Opcional. Sin ella se usa el flujo clásico con `scope`, que es lo que
       funciona en una app recién creada. Con ella, Facebook Login for Business:
       los permisos salen de la configuración y no de cada pedido. */
    name: "META_LOGIN_CONFIG_ID", seBusca: "nombre", platform: "Meta",
    tipo: "api_key", soloServidor: true,
    etiqueta: "Configuración de Login for Business (opcional)",
    para: "Sólo si Meta pide una configuración. Los permisos salen de ella, no de cada botón.",
    revisar: v => /^\d+$/.test(v.trim()) ? null
      : "El identificador de una configuración son sólo números.",
  },

  /* ── Meta: lo que escribe el botón ─────────────────────────────────── */
  { name: "META_LONG_LIVED_TOKEN", seBusca: "nombre", platform: "Meta", tipo: "oauth", porBoton: true,
    etiqueta: "Token de acceso", para: "Lo escribe Conectar. Dura sesenta días." },

  { name: "FACEBOOK_PAGE_ID", seBusca: "nombre", platform: "Facebook", tipo: "api_key", porBoton: true,
    etiqueta: "Identificador de la página", para: "Lo escribe Conectar." },
  { name: "FACEBOOK_PAGE_ACCESS_TOKEN", seBusca: "nombre", platform: "Facebook", tipo: "oauth", porBoton: true,
    etiqueta: "Token de la página", para: "Lo escribe Conectar. Es el que publica." },

  { name: "INSTAGRAM_BUSINESS_ID", seBusca: "nombre", platform: "Instagram", tipo: "api_key", porBoton: true,
    etiqueta: "Identificador de la cuenta Business", para: "Lo escribe Conectar." },
  { name: "INSTAGRAM_ACCESS_TOKEN", seBusca: "nombre", platform: "Instagram", tipo: "oauth", porBoton: true,
    etiqueta: "Token de acceso", para: "Lo escribe Conectar. Es el token de la página." },
  { name: "INSTAGRAM_IG_USER_ID", seBusca: "nombre", platform: "Instagram", tipo: "api_key", porBoton: true,
    etiqueta: "Identificador de usuario", para: "Lo escribe Conectar. Opcional." },

  { name: "WHATSAPP_WABA_ID", seBusca: "nombre", platform: "WhatsApp", tipo: "api_key", porBoton: true,
    etiqueta: "Identificador de la cuenta", para: "Lo escribe Conectar." },
  { name: "WHATSAPP_PHONE_NUMBER_ID", seBusca: "nombre", platform: "WhatsApp", tipo: "api_key", porBoton: true,
    etiqueta: "Identificador del número", para: "Lo escribe Conectar." },
  { name: "WHATSAPP_ACCESS_TOKEN", seBusca: "nombre", platform: "WhatsApp", tipo: "oauth", porBoton: true,
    etiqueta: "Token de acceso", para: "Lo escribe Conectar." },

  /* ── Herramientas ──────────────────────────────────────────────────── */
  {
    /* `buscar-web` la resuelve por plataforma y tipo, sin mirar el nombre: el
       nombre es para reconocerla en la lista, y cualquiera sirve. */
    name: "SERPER_API_KEY", platform: "Serper.dev", tipo: "api_key",
    seBusca: "plataforma",
    etiqueta: "Clave de Serper",
    para: "Buscar en la web al dar de alta un artículo: marca, logo, fotos.",
  },
  {
    /* Ni por nombre ni por plataforma: el mapa lee `VITE_MAPBOX_TOKEN` del
       entorno. Se marca `plataforma` para no acusar a la entrada cargada de no
       servir — no sirve, pero por otra razón, y eso ya lo dice `para`. */
    name: "MAPBOX_ACCESS_TOKEN", platform: "Mapbox", tipo: "token",
    seBusca: "plataforma",
    etiqueta: "Token público",
    /* Se dice acá porque es la diferencia entre cargarla y que sirva: hoy el
       mapa lee `VITE_MAPBOX_TOKEN` del entorno, no el Vault. */
    para: "Referencia. El mapa lee VITE_MAPBOX_TOKEN del entorno, no esta entrada.",
    revisar: v => v.trim().startsWith("pk.")
      ? null
      : "Un token público de Mapbox empieza con «pk.». El que empieza con «sk.» es secreto.",
  },
];

/** Las que se pueden cargar a mano para esa plataforma. */
export const requeridasDe = (platform: string): CredencialRequerida[] =>
  REQUERIDAS.filter(c => c.platform === platform);

export const requerida = (platform: string, name: string): CredencialRequerida | null =>
  REQUERIDAS.find(c => c.platform === platform && c.name === name) ?? null;

/**
 * Si el nombre está mal Y el nombre importa.
 *
 * Sólo para las plataformas que se buscan POR NOMBRE. Sobre las que se buscan
 * por plataforma, un nombre distinto no rompe nada, y marcarlas era acusarlas en
 * falso: pasó con la clave de Serper, que se lee perfectamente.
 *
 * Una credencial cargada con el nombre equivocado —cuando el nombre importa— es
 * peor que una que falta: la que falta se ve.
 */
export const nadieLaLee = (platform: string, name: string): boolean => {
  const dePlataforma = requeridasDe(platform);
  if (dePlataforma.length === 0) return false;
  if (!dePlataforma.some(c => c.seBusca === "nombre")) return false;
  return !requerida(platform, name);
};
