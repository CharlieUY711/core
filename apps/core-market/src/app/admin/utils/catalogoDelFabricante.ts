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

/** Dónde suelen vivir los catálogos. Se prueban en este orden. */
const RUTAS_DE_CATALOGO = [
  "/productos", "/products", "/catalogo", "/catalogue",
  "/tienda", "/shop", "/nuestros-productos", "/es/productos",
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

/** Trae una URL por el proxy. `null` si no se pudo. */
async function traer(url: string): Promise<string | null> {
  try {
    const d = await invocar("import-proxy", { url });
    if (!d?.ok || typeof d.body !== "string") return null;
    return d.body;
  } catch (_) {
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
export async function catalogoDelFabricante(
  dominio: string,
  paginaConocida?: string | null,
): Promise<ResultadoBusqueda[]> {
  const candidatas = paginaConocida
    ? [paginaConocida, ...RUTAS_DE_CATALOGO.map((r) => `https://${dominio}${r}`)]
    : RUTAS_DE_CATALOGO.map((r) => `https://${dominio}${r}`);

  let texto = "";
  let dominioLeido = dominio;
  for (const url of candidatas) {
    const html = await traer(url);
    if (!html) continue;
    const t = aTexto(html);
    // Una página de error o un redirect a la portada dejan poco texto: no vale
    // la pena mandarle eso al modelo.
    if (t.length < 400) continue;
    texto = t;
    try { dominioLeido = new URL(url).hostname.replace(/^www\./, ""); } catch { /* queda el dado */ }
    break;
  }
  if (!texto) return [];

  try {
    // El primer tramo alcanza: los catálogos listan los productos arriba y
    // siguen con pie de página, legales y formularios.
    const d = await invocar("extract-catalog", { chunk: texto.slice(0, 12000) });
    const filas = Array.isArray(d?.rows) ? d.rows : [];

    return filas
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
  } catch (_) {
    return [];
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

export async function tiendaOficialLocal(
  marca: string, dominioMarca: string | null,
): Promise<string | null> {
  const q = `${marca.trim()} distribuidor oficial Uruguay`;
  const r = await buscar(q, { incluirCanales: false });

  for (const x of r) {
    let host = "";
    try { host = new URL(x.url ?? "").hostname.replace(/^www\./, ""); } catch { continue; }
    if (!host) continue;
    // El sitio de la marca ya se intentó antes; si estamos acá, no sirvió.
    if (dominioMarca && host.endsWith(dominioMarca.replace(/^www\./, ""))) continue;
    if (NO_SON_TIENDA_OFICIAL.some((d) => host.includes(d))) continue;
    // Diarios y notas: hablan de la marca, no la venden.
    if (/noticias|diario|observador|elpais|montevideo\.com/.test(host)) continue;
    return host;
  }
  return null;
}
