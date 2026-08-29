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

/** Caminos donde los sitios publican sus productos. */
const CAMINOS_DE_PRODUCTO = [
  /\/producto[s]?\//i, /\/product[s]?\//i, /\/item[s]?\//i,
  /\/p\//i, /\/tienda\//i, /\/shop\//i, /\/store\//i,
  /\/catalogo\//i, /\/supermercado\//i, /\/comprar\//i,
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
 *   2 = la URL dice producto
 *   1 = no dice nada en contra
 *  -1 = es una sección del sitio, o la portada
 */
export function puntajeDeProducto(url: string | null): number {
  const camino = caminoDe(url);
  if (!camino || camino === "/") return -1;              // la portada nunca es un producto
  if (CAMINOS_DE_SECCION.some((p) => p.test(camino))) return -1;
  if (CAMINOS_DE_PRODUCTO.some((p) => p.test(camino))) return 2;
  return 1;
}

/** Normaliza para comparar títulos: sin acentos, sin puntuación, sin espacios. */
const normalizar = (s: string): string =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

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
): Promise<ResultadoBusqueda[]> {
  const q = texto.trim();
  if (q.length < 3) return [];
  const conMarca = marca.trim() ? `${marca.trim()} ${q}` : q;

  const delSitio = dominio
    ? await buscar(`site:${dominio} ${q}`, { incluirCanales: false })
    : [];

  const crudos = delSitio.length > 0
    ? delSitio
    : await buscar(conMarca, { incluirCanales: false });

  const marcaN = normalizar(marca);
  const vistos = new Set<string>();
  const conPuntaje: Array<{ r: ResultadoBusqueda; puntos: number }> = [];

  for (const r of crudos) {
    const dom = dominioDe(r.url);
    if (NO_SON_CATALOGO.some((d) => dom.endsWith(d))) continue;

    // El nombre tiene que mencionar la marca. Buscando "Colinas de Garzón
    // aceite" Google trae también aceites de otras marcas: son competencia,
    // no son este artículo.
    const nombreN = normalizar(r.nombre);
    if (marcaN && !nombreN.includes(marcaN)) continue;

    // El mismo producto aparece en cinco tiendas. Interesa una vez.
    const clave = nombreN.slice(0, 60);
    if (vistos.has(clave)) continue;
    vistos.add(clave);

    const puntos = puntajeDeProducto(r.url);
    if (puntos < 0) continue;                            // secciones y portadas, fuera
    conPuntaje.push({ r, puntos });
  }

  return conPuntaje
    .sort((a, b) => b.puntos - a.puntos)
    .map((x) => x.r)
    .slice(0, 8);
}
