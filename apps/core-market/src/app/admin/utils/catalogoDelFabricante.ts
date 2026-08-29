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

/** Sin acentos, sin espacios, sin puntuación: para comparar marcas. */
const normalizar = (t: string): string =>
  t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

/** Secciones de un sitio que nunca son catálogo. */
const NO_ES_FAMILIA = /blog|soporte|support|corporativo|contacto|nosotros|cuenta|login|carrito|checkout|envios|devoluciones|medios-de-pago|terminos|privacidad|servicio|software|ayuda/i;

/**
 * Las familias que el sitio muestra en su navegación.
 *
 * MundoMac tiene el catálogo repartido: `/mac`, `/iphone`, `/ipad`, `/watch`.
 * Leyendo una sola página se sacan los productos de esa página y nada más —por
 * eso el primer intento devolvió accesorios y ningún iPhone—. Las familias
 * están a la vista en la navegación, así que se leen de ahí.
 *
 * Se toman enlaces de un solo nivel del mismo dominio: `/iphone` es una
 * familia, `/iphone/17-pro-max-256gb` es un producto adentro de ella.
 */
function familiasEnLaPagina(html: string, dominio: string): string[] {
  const rutas = new Set<string>();
  for (const m of html.matchAll(/href="(\/[a-z0-9-]{2,30})\/?"/gi)) {
    const ruta = m[1].toLowerCase();
    if (NO_ES_FAMILIA.test(ruta)) continue;
    rutas.add(`https://${dominio}${ruta}`);
  }
  return [...rutas].slice(0, 6);
}

export async function catalogoDelFabricante(
  dominio: string,
  paginaConocida?: string | null,
  marcaEsperada?: string,
): Promise<LecturaDeCatalogo> {
  const candidatas = paginaConocida
    ? [paginaConocida, ...RUTAS_DE_CATALOGO.map((r) => `https://${dominio}${r}`)]
    : RUTAS_DE_CATALOGO.map((r) => `https://${dominio}${r}`);

  let texto = "";
  let dominioLeido = dominio;
  let motivo: string | null = null;
  let htmlLeido = "";
  let urlLeida = "";
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
    htmlLeido = html;
    urlLeida = url;
    try { dominioLeido = new URL(url).hostname.replace(/^www\./, ""); } catch { /* queda el dado */ }
    break;
  }
  if (!texto) {
    console.warn(`[catalogo] ${dominio}: ninguna de las rutas devolvió texto legible.`);
    return { items: [], motivo: motivo ?? `No pude abrir ninguna página de ${dominio}.` };
  }

  /**
   * Se leen la página de entrada Y sus familias.
   *
   * Una sola página devuelve los productos de esa página: para MundoMac eso
   * fueron accesorios de Belkin, HOCO y Spigen, y ningún iPhone. Las familias
   * —`/mac`, `/iphone`, `/ipad`, `/watch`— están en la navegación y ahí sí
   * están los productos de la marca.
   *
   * La familia sale de la ruta, que es más confiable que lo que el modelo
   * infiera del texto: `/iphone` es "iPhone" sin lugar a duda.
   */
  const paginas: Array<{ url: string; texto: string; familia: string | null }> = [
    { url: urlLeida, texto, familia: null },
  ];
  for (const url of familiasEnLaPagina(htmlLeido, dominioLeido)) {
    if (url === urlLeida) continue;
    const h = await traer(url);
    if (!h) continue;
    const t = aTexto(h);
    if (t.length < 400) continue;
    const ruta = (() => { try { return new URL(url).pathname; } catch { return ""; } })();
    const nombreFamilia = ruta.replace(/\//g, "").replace(/-/g, " ").trim();
    paginas.push({ url, texto: t, familia: nombreFamilia || null });
    if (paginas.length >= 5) break;      // cinco alcanzan; más es demora y gasto
  }
  console.info(`[catalogo] ${dominioLeido}: ${paginas.length} páginas a extraer`);

  const marcaN = normalizar(marcaEsperada ?? "");
  const items: ResultadoBusqueda[] = [];
  let huboError: string | null = null;

  for (const pag of paginas) {
    try {
      const d = await invocar("extract-catalog", { chunk: pag.texto.slice(0, 12000) });
      if (d?.error) { huboError = String(d.error); console.warn("[catalogo] extractor:", d.error); continue; }
      const filas = Array.isArray(d?.rows) ? d.rows : [];

      for (const f of filas as any[]) {
        if (typeof f?.nombre !== "string" || f.nombre.trim().length < 2) continue;

        /*
         * SÓLO PRODUCTOS DE LA MARCA.
         *
         * Un representante vende varias marcas: MundoMac tiene Belkin, HOCO,
         * Spigen y MSI junto con Apple. Pedir "el catálogo de Apple" y recibir
         * una funda de Spigen es traer el catálogo de la tienda, no el de la
         * marca.
         *
         * Se acepta si la marca que declaró el extractor coincide, o si el
         * nombre la menciona. Sin marca declarada y sin mención, no entra.
         */
        if (marcaN) {
          const declarada = normalizar(String(f.marca ?? ""));
          const enNombre  = normalizar(String(f.nombre));
          const esDeLaMarca = (declarada && (declarada.includes(marcaN) || marcaN.includes(declarada)))
                           || enNombre.includes(marcaN);
          if (!esDeLaMarca) continue;
        }

        items.push({
          nombre: String(f.nombre).trim(),
          imagen: null,
          url: null,
          descripcion: typeof f.descripcion === "string" ? f.descripcion : null,
          fuente: dominioLeido,
          precio: Number.isFinite(Number(f.precio)) && Number(f.precio) > 0
            ? Number(f.precio) : null,
          moneda: typeof f.moneda === "string" && f.moneda.trim() ? f.moneda.trim() : null,
          // La ruta manda sobre lo que el modelo infiera: `/iphone` es iPhone.
          familia: pag.familia
            ?? (typeof f.categoria === "string" && f.categoria.trim() ? f.categoria.trim() : null),
        });
      }
    } catch (err) {
      console.warn("[catalogo] no se pudo llamar al extractor:", err);
      huboError = "No se pudo usar el extractor de catálogos.";
    }
  }

  // Un producto puede repetirse entre la portada y su familia.
  const vistos = new Set<string>();
  const unicos = items.filter((r) => {
    const k = normalizar(r.nombre);
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  }).slice(0, 60);

  console.info(`[catalogo] ${dominioLeido}: ${unicos.length} productos de ${marcaEsperada ?? "la marca"}`);

  return {
    items: unicos,
    motivo: unicos.length ? null
      : huboError
        ? `Leí ${dominioLeido} pero no pude extraer los productos: ${huboError.slice(0, 120)}`
        : `Leí ${dominioLeido} pero no encontré productos de ${marcaEsperada ?? "esa marca"} ahí.`,
  };
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
