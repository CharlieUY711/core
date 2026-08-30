/**
 * Cómo se consigue cada credencial. Una sola definición, para todo el panel.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POR QUÉ ESTO EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un instructivo no resuelve el problema: lo delega. Decirle a alguien "andá a
 * developers.facebook.com y traé el identificador de la app" es pedirle que
 * haga de intermediario entre dos sistemas que no conoce, y después culparlo
 * cuando pega el valor equivocado.
 *
 * Acá cada credencial declara SUS pasos: a dónde se va —con el enlace exacto,
 * verificado—, qué se busca en esa pantalla, y qué se trae. El asistente
 * (components/Asistente.tsx) los recorre, recibe lo que el usuario copia, lo
 * revisa antes de guardar y guarda con el nombre correcto.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TRES CLASES DE CREDENCIAL, Y NO SE MEZCLAN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   POR BOTÓN     Se conecta con OAuth. No hay nada que copiar y el asistente
 *                 no debe pedir nada: lo único correcto es mandar al botón.
 *   EN EL VAULT   Se pega una clave. Es el caso normal.
 *   EN EL SERVIDOR Vive en los Secrets de Supabase, no en el Vault. El usuario
 *                 no puede cargarla desde el panel y hay que decirlo, no
 *                 mostrarle un formulario que no va a servir de nada.
 *
 * Confundirlas es lo que hace que alguien cargue nueve entradas a mano cuando
 * había un botón, o que busque en el panel algo que sólo se pone por terminal.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LOS ENLACES SE VERIFICAN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Todos los de acá responden 200. `serper.dev/api-key` parecía la URL obvia y
 * da 404: por eso se apunta a la raíz y se dice qué buscar adentro. Un enlace
 * roto en un asistente es peor que no tenerlo — deja al usuario convencido de
 * que se equivocó él.
 */
import type { VaultType } from "../services/apiVaultTypes";

export interface CampoDePaso {
  /** El nombre EXACTO con el que se guarda. El código lo busca así. */
  name: string;
  label: string;
  pista?: string;
  tipo?: VaultType;
  /** Devuelve el problema, o null si está bien. Se revisa antes de guardar. */
  revisar?: (v: string) => string | null;
}

export interface PasoDeCredencial {
  titulo: string;
  detalle: string;
  /** A dónde ir. Se abre en otra pestaña: nadie pierde el panel. */
  enlace?: { label: string; url: string };
  /** Qué traerse de ahí. Sin esto, el paso es sólo hacer algo. */
  campo?: CampoDePaso;
}

export interface GuiaDeCredencial {
  plataforma: string;
  /** Una línea: para qué sirve. */
  para: string;
  /** Se conecta con un botón: no hay nada que copiar. */
  porBoton?: { texto: string; ruta: string };
  /** Vive en los Secrets del servidor, no en el Vault. */
  enElServidor?: { texto: string; comando: string };
  pasos: PasoDeCredencial[];
}

/* ─────────────────────────────────────────────────────────────────────── */

const soloNumeros = (v: string) =>
  /^\d+$/.test(v.trim()) ? null : "Tiene que ser sólo números, sin espacios.";

const noVacio = (v: string) =>
  v.trim().length >= 8 ? null : "Parece incompleto: una clave no es tan corta.";

export const GUIAS: GuiaDeCredencial[] = [
  {
    plataforma: "Serper.dev",
    para: "Buscar en la web al dar de alta un artículo: marca, logo, fotos y videos.",
    pasos: [
      {
        titulo: "Creá una cuenta en Serper",
        detalle: "Es gratis para empezar y no pide tarjeta. Entrá con Google o con tu correo.",
        /* La raíz y no `/api-key`: esa URL parece la obvia y devuelve 404. */
        enlace: { label: "Abrir serper.dev", url: "https://serper.dev/" },
      },
      {
        titulo: "Copiá la clave del panel",
        detalle:
          "Una vez adentro, la clave está en el panel, en la sección API Key. " +
          "Es una cadena larga de letras y números.",
        campo: {
          name: "SERPER_API_KEY",
          label: "Clave de Serper",
          pista: "Se ve como 8f3a9c…",
          tipo: "api_key",
          revisar: noVacio,
        },
      },
    ],
  },

  {
    plataforma: "Meta",
    para: "La app de Meta con la que se conectan Instagram, Facebook y WhatsApp.",
    enElServidor: {
      texto:
        "Esta no va en el Vault: es del servidor y vale para todas las tiendas. " +
        "Se carga una sola vez, desde la terminal.",
      comando: 'npx supabase secrets set META_APP_SECRETS="<identificador>:<clave>"',
    },
    pasos: [
      {
        titulo: "Creá la app en Meta",
        detalle: "Crear app → tipo Empresa. Si ya tenés una, saltá este paso.",
        enlace: { label: "Abrir developers.facebook.com", url: "https://developers.facebook.com/apps/" },
      },
      {
        titulo: "Copiá el identificador",
        detalle:
          "En el menú de la izquierda: Configuración de la app → Básica. " +
          "El identificador es un número largo, arriba de todo.",
        campo: {
          name: "META_APP_ID",
          label: "Identificador de la app",
          pista: "Sólo números, tipo 1180234567890123",
          revisar: soloNumeros,
        },
      },
      {
        titulo: "Mostrá y copiá la clave secreta",
        detalle:
          "En la misma pantalla, debajo del identificador. Está oculta: apretá " +
          "Mostrar y te pide tu contraseña de Facebook.",
        campo: {
          name: "META_APP_SECRET",
          label: "Clave secreta de la app",
          pista: "Letras y números, sin espacios",
          revisar: noVacio,
        },
      },
    ],
  },

  {
    plataforma: "Instagram",
    para: "Ver el perfil, la galería y publicar.",
    porBoton: {
      texto:
        "No hay nada que copiar. Instagram se conecta con el botón Conectar, " +
        "que hace un solo login de Facebook y resuelve los tres identificadores.",
      ruta: "/admin/meta",
    },
    pasos: [],
  },
  {
    plataforma: "Facebook",
    para: "Ver la página, sus publicaciones y publicar.",
    porBoton: {
      texto: "Se conecta con el botón Conectar, en la pantalla de Meta.",
      ruta: "/admin/meta",
    },
    pasos: [],
  },
  {
    plataforma: "WhatsApp",
    para: "Ver el número, las plantillas y avisarle a un comprador.",
    porBoton: {
      texto: "Se conecta con el botón Conectar, en la pantalla de Meta.",
      ruta: "/admin/meta",
    },
    pasos: [],
  },

  {
    plataforma: "MercadoLibre",
    para: "Publicar y sincronizar en el canal.",
    porBoton: {
      texto:
        "Se conecta entrando con tu cuenta de Mercado Libre. El mismo login " +
        "sirve para Mercado Pago: es una sola conexión.",
      ruta: "/admin/ml",
    },
    pasos: [],
  },
  {
    plataforma: "MercadoPago",
    para: "Cobrar.",
    porBoton: {
      texto: "Se conecta con el mismo login que Mercado Libre.",
      ruta: "/admin/ml",
    },
    pasos: [],
  },

  {
    plataforma: "Mapbox",
    para: "Completar la dirección y ubicar la calle en Mi perfil.",
    enElServidor: {
      /*
       * Decirlo importa: hoy la pantalla de Mapas prueba contra
       * `VITE_MAPBOX_TOKEN` y NO contra el Vault. Cargar la clave acá y esperar
       * que los mapas anden es exactamente el tipo de silencio que veníamos
       * sacando.
       */
      texto:
        "El mapa lee el token de una variable del entorno, no del Vault: la " +
        "llamada va desde el navegador. Cargarlo acá no hace que los mapas " +
        "funcionen; hay que ponerlo en VITE_MAPBOX_TOKEN al desplegar.",
      comando: "VITE_MAPBOX_TOKEN=pk.tu_token_publico",
    },
    pasos: [
      {
        titulo: "Copiá tu token público",
        detalle:
          "En Mapbox, Access tokens. El que dice Default public token sirve; " +
          "empieza con pk.",
        enlace: { label: "Abrir account.mapbox.com", url: "https://account.mapbox.com/access-tokens/" },
        campo: {
          name: "MAPBOX_ACCESS_TOKEN",
          label: "Token público",
          pista: "Empieza con pk.",
          tipo: "token",
          revisar: v => v.trim().startsWith("pk.")
            ? null
            : "Un token público de Mapbox empieza con «pk.». El que empieza con «sk.» es secreto y no va en el navegador.",
        },
      },
    ],
  },
];

export const guiaDe = (plataforma: string): GuiaDeCredencial | null =>
  GUIAS.find(g => g.plataforma.toLowerCase() === plataforma.toLowerCase()) ?? null;
