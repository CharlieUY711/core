/**
 * Buscar ARTÍCULOS de una marca — no páginas de la marca.
 *
 * EL PROBLEMA QUE RESUELVE
 * Restringir la búsqueda al dominio del fabricante no alcanza: el sitio de una
 * marca tiene su catálogo, pero también tiene "Turismo", "Calidad", "Nuestra
 * historia" y la portada. Buscando `site:colinasdegarzon.com` volvían esas
 * páginas mezcladas con los productos, y ninguna sirve para dar de alta un
 * artículo.
 *
 * LA SEÑAL QUE SÍ FUNCIONA: LA URL
 * Mirando resultados reales, las páginas de producto se reconocen por su
 * camino —`/producto/aceite-de-oliva-colinas-de-garzon`, `/productos/aceites/`,
 * `/supermercado/aceite-de-oliva-extra-virgen`— y las secciones editoriales
 * también —`/turismo`, `/noticias`, `/nosotros`, y la raíz—.
 *
 * No es infalible: un sitio puede publicar productos en `/catalogo` sin que
 * esté en la lista, o llamar `/producto` a una nota. Por eso los patrones
 * ORDENAN en vez de descartar: lo que parece producto va primero, lo que
 * parece sección se cae, y el resto queda en el medio. Quedarse sin resultados
 * es peor que mostrar uno dudoso al final.
 */
import { buscar, type ResultadoBusqueda } from "./busqueda";
import { catalogoDelFabricante, tiendaOficialLocal } from "./catalogoDelFabricante";

/** Caminos donde los sitios publican sus productos. */
const CAMINOS_DE_PRODUCTO = [
  /\/producto[s]?\//i, /\/product[s]?\//i, /\/item[s]?\//i,
  /\/p\//i, /\/tienda\//i, /\/shop\//i, /\/store\//i,
  /\/catalogo\//i, /\/supermercado\//i, /\/comprar\//i,
];

/**
 * Títulos que son el nombre de una sección, no de un producto.
 *
 * "Productos" es el índice del catálogo; "Cultura y Salud" y "Dónde estamos"
 * son páginas institucionales. Todas viven en el sitio del fabricante y ninguna
 * es algo que se pueda vender.
 */
const TITULOS_DE_SECCION = [
  /^productos?$/i, /^catálogo$/i, /^catalogo$/i, /^tienda$/i, /^shop$/i,
  /^inicio$/i, /^home$/i, /^nosotros$/i, /^empresa$/i, /^la empresa$/i,
  /^d[óo]nde estamos/i, /^contacto$/i, /^noticias$/i, /^novedades$/i,
  /^cultura/i, /^blog$/i, /^prensa$/i, /^historia$/i, /^calidad$/i,
  /^c[óo]mo lo hacemos/i, /^turismo$/i, /^visitas$/i, /^comercio$/i,
];

/** Caminos que nunca son un producto, por más que estén en el sitio correcto. */
const CAMINOS_DE_SECCION = [
  /\/(nosotros|about|empresa|historia|quienes)/i,
  /\/(turismo|visitas|tour|experiencias)/i,
  /\/(noticias|news|blog|prensa|comunicados)/i,
  /\/(contacto|contact|ayuda|faq|soporte)/i,
  /\/(calidad|sustentabilidad|responsabilidad)/i,
  /\/(login|carrito|cart|checkout|cuenta)/i,
  /\/(terminos|privacidad|legal|cookies)/i,
];

/** Dominios que no venden: hablan de las marcas o son redes. */
const NO_SON_CATALOGO = [
  "wikipedia.org", "facebook.com", "instagram.com", "x.com", "twitter.com",
  "youtube.com", "tiktok.com", "linkedin.com", "pinterest.com", "reddit.com",
  "quora.com", "blogspot.com", "wordpress.com", "medium.com",
];

const dominioDe = (url: string | null): string => {
  if (!url) return "";
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
};
const caminoDe = (url: string | null): string => {
  if (!url) return "";
  try { return new URL(url).pathname; } catch { return ""; }
};

/**
 * Qué tan probable es que este resultado sea un producto.
 *   2 = la URL dice producto: `/shop/product/…`, `/productos/aceites/…`
 *   1 = no lo dice, pero tiene forma de página de producto
 *  -1 = es una sección, un índice o la portada
 *
 * RECHAZA POR DEFECTO, Y ESE ES EL CAMBIO
 * Antes lo que no coincidía con nada puntuaba 1 y pasaba. Con eso, el catálogo
 * de una marca traía "Dónde estamos", "Cultura y Salud" y "Productos" —el
 * índice, no un producto—. Que la lista tenga menos entradas es mejor que
 * ofrecer dar de alta un artículo llamado "Dónde estamos".
 *
 * LA PROFUNDIDAD ES LA SEÑAL QUE FALTABA
 * Mirando URLs reales, los productos viven a dos o más niveles
 * —`/shop/product/724-aceite-…`, `/productos/aceites/aceite-de-oliva-…`— y las
 * secciones a uno solo: `/productos`, `/alimentos`, `/contacto`. Un nivel es un
 * índice; dos o más es algo concreto adentro de él.
 */
export function puntajeDeProducto(url: string | null, titulo?: string | null): number {
  const camino = caminoDe(url);
  if (!camino || camino === "/") return -1;              // la portada nunca es un producto
  if (CAMINOS_DE_SECCION.some((p) => p.test(camino))) return -1;

  const t = (titulo ?? "").trim();
  if (t && TITULOS_DE_SECCION.some((p) => p.test(t))) return -1;

  if (CAMINOS_DE_PRODUCTO.some((p) => p.test(camino))) return 2;

  const niveles = camino.split("/").filter(Boolean).length;
  return niveles >= 2 ? 1 : -1;
}

/** Normaliza para comparar títulos: sin acentos, sin puntuación, sin espacios. */
const normalizar = (s: string): string =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

export interface ArticulosEncontrados {
  items: ResultadoBusqueda[];
  /**
   * `true` cuando lo que se muestra es el catálogo de la marca y no
   * coincidencias con lo escrito. La pantalla tiene que decirlo: ver una lista
   * que no responde a lo que se tipeó, sin aviso, se lee como que el buscador
   * anda mal.
   */
  esCatalogo: boolean;
}

export interface BusquedaDeArticulo {
  /** Marca ya confirmada. Acota todo lo demás. */
  marca: string;
  /** Dominio del fabricante, si se conoce. */
  dominio: string | null;
  /** Lo que se está escribiendo en el campo Artículo. */
  texto: string;
}

/**
 * Artículos de la marca.
 *
 * Primero el sitio del fabricante; si no devuelve nada —Serper no siempre
 * soporta `site:` en dominios chicos, y no todas las marcas publican catálogo—
 * se abre a la web, siempre con la marca por delante.
 *
 * En los dos casos se filtra a lo que parece un producto: es lo que separa
 * "Aceite de Oliva Colinas de Garzón 500ml" de "Turismo".
 */
export async function buscarArticulosDeMarca(
  { marca, dominio, texto }: BusquedaDeArticulo,
): Promise<ArticulosEncontrados> {
  const q = texto.trim();
  const conMarca = marca.trim() ? `${marca.trim()} ${q}` : q;

  /*
   * Con la marca identificada, siempre hay algo que mostrar.
   *
   * Una marca no llama a sus productos como los busca quien los vende:
   * Olivares de Santa Laura tiene "Selección Limitada", "Reserva Familiar" y
   * "Bag in box de 3L" — ninguno dice "Aceite". Buscar "Aceite" y no encontrar
   * nada no significa que la marca no venda aceite: significa que no lo llama
   * así.
   *
   * Entonces, si lo escrito no coincide con nada, se muestra el CATÁLOGO de la
   * marca. Elegir de una lista de diez es más rápido que adivinar cómo le puso
   * el fabricante.
   */
  const filtrar = (crudos: ResultadoBusqueda[]) => filtrarProductos(crudos, marca, dominio);

  if (marca.trim() && q.length < 3) {
    return { items: await catalogoDeMarca(marca, dominio), esCatalogo: true };
  }
  if (q.length < 3) return { items: [], esCatalogo: false };

  const delSitio = dominio
    ? await buscar(`site:${dominio} ${q}`, { incluirCanales: false })
    : [];

  const coincidencias = filtrar(
    delSitio.length > 0
      ? delSitio
      : await buscar(conMarca, { incluirCanales: false }),
  );
  if (coincidencias.length > 0) return { items: coincidencias, esCatalogo: false };

  if (!marca.trim()) return { items: [], esCatalogo: false };
  return { items: filtrar(await catalogoDeMarca(marca, dominio)), esCatalogo: true };
}

/**
 * Lo que la marca vende, sin filtrar por lo que se escribió.
 *
 * `site:` no sirve acá: Serper devuelve cero para dominios chicos —probado con
 * santalaura.uy y con colinasdegarzon.com— aunque funcione con apple.com. La
 * consulta que sí trae catálogo es el nombre de la marca más "productos", que
 * saca las páginas de producto de su sitio y de las tiendas que la venden.
 */
export async function catalogoDeMarca(
  _marca: string, dominio: string | null,
): Promise<ResultadoBusqueda[]> {
  /*
   * EL CATÁLOGO SE LEE DEL SITIO, O NO HAY CATÁLOGO.
   *
   * Antes, si no se podía leer el sitio, se caía a buscar "<marca> productos"
   * en Google. Para una marca chica daba algo pasable; para Apple daba esto:
   *
   *     Productos del Campo Delivery - App Store - Apple
   *     Cómo crear productos que la gente quiera comprar
   *     Marketing de productos - Trabaja en Apple (ES)
   *     CANCIÓN PROMOCIONAL PARA TODO TIPO DE …
   *     Navegar en la tienda
   *
   * Todas son páginas de apple.com con profundidad suficiente, así que ningún
   * filtro por URL las puede distinguir de un producto. El problema no es el
   * filtro: es que una búsqueda no devuelve un catálogo.
   *
   * Y acá el costo del error es alto: cada fila mal ofrecida se convierte en un
   * artículo creado. Decir "no pude leer el catálogo" es mejor que proponer dar
   * de alta "CANCIÓN PROMOCIONAL".
   *
   * Lista vacía es una respuesta válida, y quien llama tiene que decirlo.
   */
  /*
   * PRIMERO EL REPRESENTANTE LOCAL, SIEMPRE.
   *
   * Es lo que importa para vender acá: tiene el catálogo que efectivamente
   * llega al país, con sus precios y sus presentaciones. El sitio global de una
   * marca lista productos que no se consiguen en Uruguay, en otras
   * configuraciones y con otros nombres comerciales.
   *
   * Apple lo muestra claro: apple.com no es un catálogo sino una red de
   * páginas por producto, y no vende directo acá. iPlace —su Premium
   * Reseller— tiene el catálogo entero con precios locales.
   *
   * No es un marketplace: ahí el catálogo es de quien publica, mezclado con
   * reventa, usados y accesorios de terceros. Es el representante de la marca.
   */
  const oficial = await tiendaOficialLocal(_marca, null);
  if (oficial) {
    const paginaOficial = await ubicarPaginaDeProductos(oficial);
    const delOficial = await catalogoDelFabricante(oficial, paginaOficial);
    if (delOficial.length > 0) return delOficial;
  }

  // El fabricante queda de respaldo: para marcas locales —Colinas de Garzón,
  // Olivares de Santa Laura— el fabricante ES el representante, y su sitio
  // tiene el catálogo.
  if (dominio) {
    const paginaProductos = await ubicarPaginaDeProductos(dominio);
    const delFabricante = await catalogoDelFabricante(dominio, paginaProductos);
    if (delFabricante.length > 0) return delFabricante;
  }

  return [];
}

/**
 * La URL de la sección de productos, si la búsqueda la conoce.
 *
 * Es justo la página que el filtro descarta por no ser un producto —"Productos"
 * es un índice— pero es donde están todos. Se la busca a propósito.
 */
async function ubicarPaginaDeProductos(dominio: string): Promise<string | null> {
  const r = await buscar(`site:${dominio} productos`, { incluirCanales: false });
  const candidata = r.find((x) => {
    const c = caminoDe(x.url).toLowerCase();
    return /product|catalog|tienda|shop/.test(c);
  });
  return candidata?.url ?? null;
}

/** Deja sólo lo que parece un producto DE esta marca. */
function filtrarProductos(
  crudos: ResultadoBusqueda[], marca: string, dominioMarca: string | null,
): ResultadoBusqueda[] {
  const marcaN = normalizar(marca);
  const vistos = new Set<string>();
  const conPuntaje: Array<{ r: ResultadoBusqueda; puntos: number }> = [];

  for (const r of crudos) {
    const dom = dominioDe(r.url);
    if (NO_SON_CATALOGO.some((d) => dom.endsWith(d))) continue;

    /*
     * El nombre tiene que mencionar la marca — salvo que el resultado venga
     * del sitio DE la marca, donde no hace falta que se nombre a sí misma.
     *
     * Olivares de Santa Laura llama a sus productos "Selección Limitada" y
     * "Bag in box de 3L". Exigirles que digan "Olivares de Santa Laura" los
     * descartaría a todos, y son justamente los que más valen: son del
     * fabricante.
     *
     * Afuera del sitio sí se exige: buscando "Colinas de Garzón aceite" Google
     * trae también aceites de otras marcas, y eso es competencia.
     */
    const esDelFabricante = !!dominioMarca && dom.endsWith(dominioMarca.replace(/^www\./, ""));
    const nombreN = normalizar(r.nombre);
    if (!esDelFabricante && marcaN && !nombreN.includes(marcaN)) continue;

    // El mismo producto aparece en cinco tiendas. Interesa una vez.
    const clave = nombreN.slice(0, 60);
    if (vistos.has(clave)) continue;
    vistos.add(clave);

    const puntos = puntajeDeProducto(r.url, r.nombre);
    if (puntos < 0) continue;                            // secciones y portadas, fuera
    conPuntaje.push({ r, puntos });
  }

  return conPuntaje
    .sort((a, b) => b.puntos - a.puntos)
    .map((x) => x.r)
    .slice(0, 8);
}
