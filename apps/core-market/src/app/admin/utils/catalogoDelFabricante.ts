/**
 * Leer el catálogo en el sitio del fabricante.
 *
 * POR QUÉ NO ALCANZA CON BUSCAR EN GOOGLE
 * Los resultados de una búsqueda son las páginas que Google decidió mostrar, no
 * el catálogo. Para Olivares de Santa Laura devolvía cuatro productos, una nota
 * de prensa y "Premios y reconocimientos" — mientras que su sitio tiene una
 * sección "Productos" con cuatro categorías y dos o más presentaciones en cada
 * una. Ni completo ni limpio.
 *
 * El catálogo está en el sitio. Hay que ir a leerlo.
 *
 * CÓMO
 *   1. Se ubica la página de productos del dominio.
 *   2. `import-proxy` la trae desde el servidor —el navegador no puede, por
 *      CORS— con sus guardas contra SSRF.
 *   3. Se reduce el HTML a texto.
 *   4. `extract-catalog` saca las filas de producto con un modelo, que es el
 *      que sabe distinguir "Bag in box de 3L" de "Premios y reconocimientos"
 *      sin que nadie escriba una regla por sitio.
 *
 * Las dos funciones ya existían y estaban desplegadas: una para importar
 * catálogos de proveedores, la otra para leer PDFs. Sirven igual para esto.
 *
 * SI FALLA, NO PASA NADA
 * Devuelve lista vacía y quien llama cae a la búsqueda de siempre. Un sitio
 * puede no tener catálogo en línea, estar hecho en JavaScript, o bloquear al
 * proxy. Eso no puede dejar sin sugerencias a quien está cargando.
 */
import { invocar } from "./canalesSync";
import { buscar, type ResultadoBusqueda } from "./busqueda";

/**
 * Dónde suelen vivir los catálogos. Se prueban en este orden.
 *
 * La portada va incluida, y no al final: muchas tiendas listan sus familias y
 * modelos ahí mismo. mundomac.com es el caso —`/productos` da 404 y la home
 * trae "Mac · MacBook · iPhone 17 Pro · iPad Air · Apple Watch"— así que
 * saltearla dejaba afuera un catálogo perfectamente legible.
 */
const RUTAS_DE_CATALOGO = [
  "/productos", "/products", "/catalogo", "/catalogue",
  "/tienda", "/shop", "/nuestros-productos", "/es/productos",
  "/",
];

/**
 * HTML → texto.
 *
 * Se sacan `script` y `style` enteros antes que las etiquetas: sin eso el
 * texto queda lleno de JavaScript y CSS, y el modelo gasta su ventana leyendo
 * código en vez de nombres de producto.
 */
function aTexto(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Trae una URL por el proxy. `null` si no se pudo.
 *
 * DEJA DICHO POR QUÉ FALLÓ.
 * Antes cada error se tragaba en silencio y el usuario veía "no pude leer el
 * catálogo" sin ninguna forma de saber si fue el proxy, un 404, un sitio hecho
 * en JavaScript o el extractor. Diagnosticarlo desde afuera era imposible: se
 * adivinaba. Ahora la consola dice el paso exacto.
 */
async function traer(url: string): Promise<string | null> {
  try {
    const d = await invocar("import-proxy", { url });
    if (d?.error) { console.warn("[catalogo] proxy:", url, "→", d.error); return null; }
    if (!d?.ok)   { console.warn("[catalogo] proxy no ok:", url, d); return null; }
    if (typeof d.body !== "string") { console.warn("[catalogo] sin cuerpo:", url); return null; }
    return d.body;
  } catch (err) {
    console.warn("[catalogo] no se pudo llamar al proxy:", url, err);
    return null;
  }
}

/**
 * El catálogo publicado en el sitio de la marca.
 *
 * `paginaConocida` es la página de productos si ya se sabe cuál es —la búsqueda
 * suele encontrarla, aunque después la descarte por no ser un producto—. Sin
 * ella se prueban las rutas habituales.
 */
export interface LecturaDeCatalogo {
  items: ResultadoBusqueda[];
  /**
   * Por qué no se pudo, en palabras de quien lo está usando.
   *
   * Va a la pantalla, no sólo a la consola: quien carga no tiene por qué abrir
   * las herramientas del navegador para enterarse de que el sitio del
   * representante está hecho en JavaScript. Y sin esto, cuatro fallas
   * distintas se veían todas como "no pude".
   */
  motivo: string | null;
}

export async function catalogoDelFabricante(
  dominio: string,
  paginaConocida?: string | null,
): Promise<LecturaDeCatalogo> {
  const candidatas = paginaConocida
    ? [paginaConocida, ...RUTAS_DE_CATALOGO.map((r) => `https://${dominio}${r}`)]
    : RUTAS_DE_CATALOGO.map((r) => `https://${dominio}${r}`);

  let texto = "";
  let dominioLeido = dominio;
  let motivo: string | null = null;
  for (const url of candidatas) {
    const html = await traer(url);
    if (!html) continue;
    const t = aTexto(html);
    // Una página de error, o un sitio hecho en JavaScript, dejan poco texto: no
    // vale la pena mandarle eso al modelo.
    if (t.length < 400) {
      motivo = `${dominio} no publica su catálogo como texto: su sitio se arma ` +
               `con JavaScript y no hay nada que leer.`;
      console.warn(`[catalogo] ${url}: sólo ${t.length} caracteres de texto.`);
      continue;
    }
    console.info(`[catalogo] leyendo ${url} — ${t.length} caracteres`);
    texto = t;
    try { dominioLeido = new URL(url).hostname.replace(/^www\./, ""); } catch { /* queda el dado */ }
    break;
  }
  if (!texto) {
    console.warn(`[catalogo] ${dominio}: ninguna de las rutas devolvió texto legible.`);
    return { items: [], motivo: motivo ?? `No pude abrir ninguna página de ${dominio}.` };
  }

  try {
    // El primer tramo alcanza: los catálogos listan los productos arriba y
    // siguen con pie de página, legales y formularios.
    const d = await invocar("extract-catalog", { chunk: texto.slice(0, 12000) });
    if (d?.error) {
      console.warn("[catalogo] el extractor falló:", d.error);
      return { items: [], motivo: `Leí ${dominioLeido} pero no pude extraer los ` +
                                  `productos: ${String(d.error).slice(0, 120)}` };
    }
    const filas = Array.isArray(d?.rows) ? d.rows : [];
    console.info(`[catalogo] ${dominioLeido}: ${filas.length} filas extraídas`);

    const items = filas
      .filter((f: any) => typeof f?.nombre === "string" && f.nombre.trim().length > 1)
      .map((f: any): ResultadoBusqueda => ({
        nombre: String(f.nombre).trim(),
        // Las imágenes que devuelve el modelo son relativas o inventables: se
        // ignoran. La foto sale después de la búsqueda de imágenes, que es la
        // que trae URLs que existen.
        imagen: null,
        url: null,
        descripcion: typeof f.descripcion === "string" ? f.descripcion : null,
        fuente: dominioLeido,
        /*
         * El precio del representante oficial, tal cual lo publica.
         *
         * No se usa para poner el precio del artículo —ese lo decide quien
         * vende— sino para mostrarlo al lado, como referencia: "así lo vende
         * el oficial". Es la comparación más útil que hay, mucho más que la
         * mediana de un marketplace, porque es el mismo producto en el mismo
         * país.
         *
         * El extractor tiene orden de NO inventar precios: si no está en el
         * texto, viene null.
         */
        precio: Number.isFinite(Number(f.precio)) && Number(f.precio) > 0
          ? Number(f.precio) : null,
        moneda: typeof f.moneda === "string" && f.moneda.trim() ? f.moneda.trim() : null,
        // La familia sale del propio catálogo -"iPhone", "Mac", "Aceites"- y es
        // lo que permite elegir de a grupos en vez de producto por producto.
        familia: typeof f.categoria === "string" && f.categoria.trim()
          ? f.categoria.trim() : null,
      }))
      .slice(0, 30);

    return {
      items,
      motivo: items.length ? null
        : `Leí ${dominioLeido} pero no encontré productos en esa página.`,
    };
  } catch (err) {
    console.warn("[catalogo] no se pudo llamar al extractor:", err);
    return { items: [], motivo: "No se pudo usar el extractor de catálogos." };
  }
}

/**
 * La tienda oficial de la marca en el país donde se vende.
 *
 * POR QUÉ HACE FALTA
 * Hay marcas cuyo catálogo no se puede leer del sitio del fabricante: Apple no
 * vende directo en Uruguay y su web es una red de páginas por producto, no un
 * catálogo. Pero su representante local sí tiene una tienda con su catálogo
 * entero, con precios locales.
 *
 * NO ES UN MARKETPLACE. Se descartan Mercado Libre, Amazon y las redes: ahí el
 * catálogo es de quien publica, no de la marca, y viene mezclado con reventa,
 * usados y accesorios de terceros. Se busca al representante oficial.
 *
 * QUÉ DEVUELVE
 * El dominio, no el catálogo: leerlo es el mismo trabajo que leer el del
 * fabricante, así que lo hace la misma función.
 */
const NO_SON_TIENDA_OFICIAL = [
  "mercadolibre", "amazon", "ebay", "aliexpress", "temu", "shein",
  "facebook.com", "instagram.com", "x.com", "twitter.com", "youtube.com",
  "wikipedia.org", "linkedin.com", "tiktok.com",
];

/**
 * Devuelve VARIAS, no una.
 *
 * Con una sola, si esa no se puede leer no hay catálogo — y da la casualidad de
 * que el primer resultado para Apple es iplace.com.uy, que está hecho en
 * JavaScript: 780 KB de HTML con UN solo enlace interno, nada que extraer. El
 * segundo, mundomac.com, se lee sin problema.
 *
 * Quedarse en el primero es perder el catálogo por un detalle de cómo está
 * construido un sitio, que no tiene nada que ver con si la marca tiene
 * representante.
 */
export async function tiendasOficialesLocales(
  marca: string, dominioMarca: string | null,
): Promise<string[]> {
  const q = `${marca.trim()} distribuidor oficial Uruguay`;
  const r = await buscar(q, { incluirCanales: false });

  const hosts: string[] = [];
  for (const x of r) {
    let host = "";
    try { host = new URL(x.url ?? "").hostname.replace(/^www\./, ""); } catch { continue; }
    if (!host || hosts.includes(host)) continue;
    /*
     * El sitio de la marca se prueba aparte; acá se buscan sus representantes.
     *
     * Y se descartan TODOS sus subdominios: para Apple, la búsqueda devuelve
     * `apple.com/la/buy/uy` y `locate.apple.com/uy/es/sales` antes que los
     * representantes, y esos dos se comían dos de los tres intentos sin ser
     * nunca un catálogo.
     */
    const raizMarca = dominioMarca ? dominioMarca.replace(/^www\./, "") : "";
    if (raizMarca && (host === raizMarca || host.endsWith("." + raizMarca))) continue;
    if (NO_SON_TIENDA_OFICIAL.some((d) => host.includes(d))) continue;
    // Diarios y notas: hablan de la marca, no la venden.
    if (/noticias|diario|observador|elpais|montevideo\.com/.test(host)) continue;
    hosts.push(host);
    if (hosts.length >= 3) break;      // tres intentos alcanzan; más es demora
  }
  return hosts;
}
