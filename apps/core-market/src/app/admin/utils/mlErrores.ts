/**
 * Traductor de errores de Mercado Libre.
 *
 * La API devuelve cosas como:
 *
 *   body.required_fields · The body does not contains some or none of the
 *   following properties [family_name, category_id]
 *
 * Eso es diagnostico para quien escribio la integracion, no para quien esta
 * tratando de vender algo. Este modulo convierte el error en tres cosas que si
 * le sirven: que paso, por que, y que puede hacer al respecto.
 *
 * REGLA: nunca se oculta el mensaje original. Se traduce lo que se reconoce y
 * el resto se muestra tal cual, porque un error sin traducir es molesto pero
 * un error inventado es peor. `crudo` viaja siempre para poder mostrarlo en
 * un detalle desplegable o copiarlo a soporte.
 */

export interface ErrorTraducido {
  /** Titulo corto, apto para la columna de una tabla. */
  motivo: string;
  /** Explicacion en una frase de por que Mercado Libre lo rechazo. */
  detalle: string;
  /** Que tiene que hacer la persona. Null si no hay accion clara. */
  accion: string | null;
  /** El mensaje original de ML, sin tocar. */
  crudo: string;
  /** true si se reconocio el caso; false si es el fallback generico. */
  reconocido: boolean;
  /**
   * Campos que hay que tocar para resolverlo.
   *
   * Es lo que permite que un rechazo termine en el mismo formulario que un
   * faltante, con el mismo campo editable, en vez de en un aviso suelto que
   * obliga a deducir donde ir. Una regla que no puede decir que campo es deja
   * la lista vacia y se cae al aviso, pero eso es la excepcion y se ve.
   */
  campos: string[];
}

/** Extrae los nombres de campo de "[family_name, category_id]". */
function camposFaltantes(texto: string): string[] {
  const m = texto.match(/\[([^\]]+)\]/);
  if (!m) return [];
  return m[1].split(",").map((s) => s.trim()).filter(Boolean);
}

const NOMBRES_DE_CAMPO: Record<string, string> = {
  category_id:     "categoría",
  family_name:     "familia de catálogo",
  price:           "precio",
  available_quantity: "stock",
  title:           "título",
  pictures:        "imágenes",
  listing_type_id: "tipo de publicación",
  condition:       "condición",
  currency_id:     "moneda",
};

function enCastellano(campo: string): string {
  return NOMBRES_DE_CAMPO[campo] ?? campo;
}

/**
 * Cada regla se prueba contra el codigo de error y el mensaje. Se cubren los
 * casos efectivamente vistos y los documentados por ML que son frecuentes al
 * publicar; lo demas cae al fallback.
 */
interface Regla {
  aplica: (codigo: string, mensaje: string, status: number) => boolean;
  traducir: (codigo: string, mensaje: string) => Omit<ErrorTraducido, "crudo" | "reconocido">;
}

/**
 * Etiquetas de los campos editables, para poder armar el formulario desde el
 * error sin que quien lo muestre sepa de que canal viene.
 */
const ETIQUETA_CAMPO: Record<string, string> = {
  title:       "Título",
  price:       "Precio",
  stock:       "Stock",
  description: "Descripción",
  pictures:    "Imágenes",
  category_id: "Categoría de Mercado Libre",
};

export const etiquetaDeCampo = (campo: string) =>
  ETIQUETA_CAMPO[campo] ?? (campo.startsWith("attr:") ? campo.slice(5) : campo);

const REGLAS: Regla[] = [
  // family_name es el nombre de familia de producto que Mercado Libre pide en
  // los dominios con catalogo. Lo manda publicar-en-ml derivado del titulo, asi
  // que si aparece igual es que el titulo esta vacio o quedo demasiado corto.
  {
    aplica: (_c, m) => /family_name/i.test(m),
    traducir: () => ({
      campos:  ["title"],
      motivo:  "El titulo no alcanza para esta categoria",
      detalle: "Mercado Libre usa el titulo para armar el nombre de producto y el actual no le sirve: suele pasar con titulos genericos o muy cortos.",
      accion:  "Poner un titulo que describa el producto real",
    }),
  },

  // Campos obligatorios ausentes en el cuerpo del pedido.
  {
    aplica: (c) => c === "body.required_fields",
    traducir: (_c, mensaje) => {
      const campos = camposFaltantes(mensaje).map(enCastellano);
      const soloCategoria =
        campos.length > 0 && campos.every((x) => x === "categoría" || x === "familia de catálogo");

      if (soloCategoria) {
        return {
          campos:  ["category_id"],
          motivo:  "Falta la categoría",
          detalle: "Mercado Libre exige una categoría para poder publicar, y este producto todavía no tiene una asignada.",
          accion:  "Asignar la categoría de Mercado Libre",
        };
      }
      return {
        campos:  camposFaltantes(mensaje).filter((c) => c in ETIQUETA_CAMPO),
        motivo:  campos.length ? `Faltan datos: ${campos.join(", ")}` : "Faltan datos obligatorios",
        detalle: "Mercado Libre rechazó la publicación porque el producto no tiene todos los datos que exige.",
        accion:  "Completar esos datos en el producto",
      };
    },
  },

  // Atributos obligatorios de la categoria (marca, modelo, talle...).
  {
    aplica: (c, m) =>
      c.includes("attributes") || /required attribute|missing_required/i.test(m),
    traducir: (_c, mensaje) => {
      const campos = camposFaltantes(mensaje);
      return {
        // Los atributos concretos los nombra la verificacion del canal, que
        // sabe cuales exige la categoria; aca solo se sabe que hay que
        // revisarla.
        campos:  ["category_id"],
        motivo:  "Faltan atributos obligatorios",
        detalle: campos.length
          ? `La categoría elegida exige completar: ${campos.join(", ")}.`
          : "La categoría elegida exige atributos que este producto no tiene cargados.",
        accion:  "Completar los atributos del producto",
      };
    },
  },

  // Categoria inexistente, hoja incorrecta o no publicable.
  {
    aplica: (c, m) => c.includes("category") || /category.*(invalid|not.*leaf|does not exist)/i.test(m),
    traducir: () => ({
      campos:  ["category_id"],
      motivo:  "Categoría inválida",
      detalle: "La categoría asignada no existe o no admite publicaciones directas en Mercado Libre.",
      accion:  "Elegir otra categoría",
    }),
  },

  // Precio ausente, cero o fuera de rango.
  {
    aplica: (c, m) => c.includes("price") || /price.*(invalid|required|greater)/i.test(m),
    traducir: () => ({
      campos:  ["price"],
      motivo:  "Precio rechazado",
      detalle: "Mercado Libre no acepta el precio enviado: puede estar en cero, vacío o fuera del rango permitido para la categoría.",
      accion:  "Revisar el precio del producto",
    }),
  },

  // Imagenes faltantes o no accesibles.
  {
    aplica: (c, m) => c.includes("picture") || /picture|image/i.test(m),
    traducir: () => ({
      campos:  ["pictures"],
      motivo:  "Problema con las imágenes",
      detalle: "Mercado Libre no pudo usar las imágenes: pueden faltar, ser demasiado chicas o no estar accesibles públicamente.",
      accion:  "Revisar las imágenes del producto",
    }),
  },

  // "The fields [title] are invalid for requested call": el titulo no esta mal
  // escrito, no corresponde en esta llamada. Pasa en las categorias que
  // publican contra el catalogo de Mercado Libre, donde el titulo lo arma ML a
  // partir de la familia de producto. Va ANTES de la regla de titulo, que si no
  // se lo lleva puesto y manda a reescribir un titulo que esta bien.
  {
    aplica: (c, m) => /invalid_fields/i.test(c + " " + m) && /\btitle\b/i.test(m),
    traducir: () => ({
      // No hay campo que corregir: es la forma del pedido, no el dato.
      campos:  [],
      motivo:  "Esta categoría no admite título propio",
      detalle: "Mercado Libre arma el título a partir del producto de catálogo, así que no acepta que se lo enviemos.",
      accion:  "Reintentar: se envía como familia de producto",
    }),
  },

  // Titulo invalido o demasiado largo.
  {
    // Antes bastaba con que apareciera "title" en cualquier parte del mensaje.
    // Como el resumen del canal concatena codigo, mensaje y causas, un "title"
    // suelto en cualquiera de los tres se llevaba puesto el diagnostico y
    // mandaba a corregir un titulo que estaba bien. Ahora tiene que ser el
    // campo del error, o una frase que hable del titulo.
    aplica: (c, m) =>
      /(^|[.\[])title([.\]]|$)/i.test(c) ||
      /\btitle\b[^|]{0,40}(invalid|length|too long|not allowed|forbidden|blocked)/i.test(m),
    traducir: () => ({
      campos:  ["title"],
      motivo:  "Título rechazado",
      detalle: "El título no cumple las reglas de Mercado Libre: suele ser por largo o por caracteres no permitidos.",
      accion:  "Acortar o corregir el título",
    }),
  },

  // Credenciales: token vencido o permisos insuficientes.
  {
    aplica: (c, m, status) =>
      status === 401 || status === 403 || /token|unauthorized|forbidden/i.test(c + " " + m),
    traducir: () => ({
      // No es un dato del articulo: no hay campo que corregir aca.
      campos:  [],
      motivo:  "Sesión de Mercado Libre vencida",
      detalle: "La conexión con la cuenta expiró o perdió permisos, así que Mercado Libre rechazó el pedido.",
      accion:  "Reconectar la cuenta de Mercado Libre",
    }),
  },

  // Limites de la cuenta o de la categoria.
  {
    aplica: (_c, m, status) => status === 429 || /limit|quota/i.test(m),
    traducir: () => ({
      campos:  [],
      motivo:  "Límite alcanzado",
      detalle: "Mercado Libre rechazó el pedido por alcanzar un límite de la cuenta o de publicaciones.",
      accion:  "Reintentar más tarde",
    }),
  },
];

/**
 * Traduce la respuesta de error de publicar-en-ml.
 * Recibe el objeto completo: { error, status, detail } donde detail es la
 * respuesta cruda de Mercado Libre.
 */
export function traducirErrorMl(respuesta: any): ErrorTraducido {
  // publicar-en-ml devuelve `resumen`: el mismo texto que persiste en
  // last_error. Traducir siempre eso -y no el objeto crudo- es lo que hace que
  // el aviso del momento, la columna de la tabla y el modal digan lo mismo.
  // Antes el aviso leia la respuesta completa y la tabla un texto mas pobre, y
  // el mismo rechazo aparecia con tres redacciones distintas.
  if (respuesta && typeof respuesta === "object" && typeof respuesta.resumen === "string") {
    respuesta = respuesta.resumen;
  }

  // `catalog_listings.last_error` guarda solo el texto de ML, sin estructura.
  // Se acepta ese caso para poder traducir tambien lo que ya quedo registrado.
  if (typeof respuesta === "string") {
    // El codigo se usa para elegir la regla, pero no se suma al crudo: si se
    // sumara, un last_error como "body.required_fields" se mostraria dos veces
    // -"body.required_fields . body.required_fields"- que fue exactamente lo
    // que se vio en pantalla.
    respuesta = { message: respuesta, error: respuesta.split(/[\s·|]/)[0] ?? "", soloTexto: true };
  }
  const detalle = respuesta?.detail ?? respuesta ?? {};
  const codigo: string = String(detalle?.error ?? respuesta?.error ?? "");
  const mensaje: string = String(detalle?.message ?? respuesta?.message ?? "");
  const status: number = Number(respuesta?.status ?? detalle?.status ?? 0);

  // Las causas puntuales de ML suelen ser mas precisas que el mensaje general.
  const causas: string[] = Array.isArray(detalle?.cause)
    ? detalle.cause
        .map((c: any) => c?.message ?? c?.code ?? (typeof c === "string" ? c : null))
        .filter(Boolean)
        .map(String)
    : [];

  const crudo = (respuesta?.soloTexto
    ? mensaje
    : [codigo, mensaje, ...causas].filter(Boolean).join(" · ")) || "Error desconocido";
  const textoBusqueda = [mensaje, ...causas].join(" ");

  for (const regla of REGLAS) {
    if (regla.aplica(codigo, textoBusqueda, status)) {
      return { ...regla.traducir(codigo, textoBusqueda), crudo, reconocido: true };
    }
  }

  return {
    motivo:  "Mercado Libre rechazó la publicación",
    detalle: mensaje || "No informó un motivo legible.",
    accion:  null,
    // Sin regla que lo reconozca no se puede afirmar que campo tocar, y
    // adivinar uno seria mandar a corregir lo que quiza esta bien.
    campos:  [],
    crudo,
    reconocido: false,
  };
}

/** Version de una linea, para celdas de tabla. */
export function resumirErrorMl(respuesta: any): string {
  const t = traducirErrorMl(respuesta);
  return t.accion ? `${t.motivo} — ${t.accion}` : t.motivo;
}


/**
 * Campos que Mercado Libre reporta como faltantes, cruzados con lo que la
 * publicacion tiene realmente cargado.
 *
 * ML nombra los campos en su vocabulario (category_id, price...). Esto los
 * traduce a los campos que la persona puede editar, y marca cuales estan
 * vacios de verdad segun el dato actual: un campo puede figurar en el error de
 * ML y estar cargado de nuestro lado, y en ese caso no sirve pedir que lo
 * complete otra vez.
 */
export interface CampoFaltante {
  /** Clave editable: title | price | stock | description | category_id */
  campo: string;
  etiqueta: string;
  /** Valor actual, si hay. */
  actual: string | number | null;
  /** true si de verdad esta vacio de nuestro lado. */
  vacio: boolean;
}

const EDITABLES: Record<string, string> = {
  category_id: "Categoría de Mercado Libre",
  title:       "Título",
  price:       "Precio",
  stock:       "Stock",
  description: "Descripción",
};

export function camposAEditar(errorCrudo: any, datos: any): CampoFaltante[] {
  const t = traducirErrorMl(errorCrudo);
  const texto = t.crudo;

  // Campos que ML nombro explicitamente entre corchetes.
  const nombrados = new Set<string>();
  const m = texto.match(/\[([^\]]+)\]/);
  if (m) m[1].split(",").map((x) => x.trim()).forEach((x) => nombrados.add(x));

  // family_name aplica a productos de catalogo de ML; para una publicacion
  // propia lo que hace falta es la categoria, asi que no se pide aparte.
  nombrados.delete("family_name");

  // Si el motivo es de categoria, se pide aunque ML no la haya nombrado.
  if (/categor/i.test(t.motivo)) nombrados.add("category_id");
  if (/atributos/i.test(t.motivo)) nombrados.add("category_id");

  const valorDe = (campo: string) => {
    switch (campo) {
      case "category_id": return datos?.categoria ?? null;
      case "title":       return datos?.titulo ?? null;
      case "price":       return datos?.precio ?? null;
      case "stock":       return datos?.stock ?? null;
      case "description": return datos?.descripcion ?? null;
      default:            return null;
    }
  };

  return [...nombrados]
    .filter((c) => c in EDITABLES)
    .map((campo) => {
      const actual = valorDe(campo);
      const vacio = actual === null || actual === undefined || actual === "" || actual === 0;
      return { campo, etiqueta: EDITABLES[campo], actual, vacio };
    });
}
