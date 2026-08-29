/**
 * Sugerencias de marca para el paso "Marca" del alta.
 *
 * La fuente principal es la búsqueda web unificada (`buscar()`, Serper/Google
 * vía la Edge Function `buscar-web`) — así una marca chica o local aparece
 * igual que una grande, sin depender de que esté en ningún catálogo.
 *
 * La lista de acá abajo es sólo un respaldo: si la búsqueda web falla (sin
 * key cargada, sin conexión, error del proveedor) igual se puede sugerir algo
 * para las marcas más comunes en vez de dejar el campo sin nada. El logo de
 * ese respaldo sale de Logo.dev (img.logo.dev) por dominio adivinado — el
 * viejo logo.clearbit.com que se usaba antes fue dado de baja por Clearbit/
 * HubSpot en diciembre de 2025 y ya no responde.
 */
import { buscar } from "./busqueda";

export interface MarcaSugerida {
  nombre: string;
  /** Logo ya resuelto (de la búsqueda web) o null si no se encontró. */
  imagen: string | null;
  /** Dominio adivinado, sólo para el respaldo local (ver logoDeDominio). */
  dominio: string | null;
}

const MARCAS: MarcaSugerida[] = [
  { nombre:"Apple",        dominio:"apple.com",         imagen:null },
  { nombre:"Samsung",      dominio:"samsung.com",        imagen:null },
  { nombre:"Xiaomi",       dominio:"mi.com",             imagen:null },
  { nombre:"Motorola",     dominio:"motorola.com",       imagen:null },
  { nombre:"Huawei",       dominio:"huawei.com",         imagen:null },
  { nombre:"Honor",        dominio:"hihonor.com",        imagen:null },
  { nombre:"Oppo",         dominio:"oppo.com",           imagen:null },
  { nombre:"LG",           dominio:"lg.com",             imagen:null },
  { nombre:"Sony",         dominio:"sony.com",           imagen:null },
  { nombre:"Nokia",        dominio:"nokia.com",          imagen:null },
  { nombre:"Dell",         dominio:"dell.com",           imagen:null },
  { nombre:"HP",           dominio:"hp.com",             imagen:null },
  { nombre:"Lenovo",       dominio:"lenovo.com",         imagen:null },
  { nombre:"Asus",         dominio:"asus.com",           imagen:null },
  { nombre:"Acer",         dominio:"acer.com",           imagen:null },
  { nombre:"Microsoft",    dominio:"microsoft.com",      imagen:null },
  { nombre:"Google",       dominio:"google.com",         imagen:null },
  { nombre:"Nintendo",     dominio:"nintendo.com",       imagen:null },
  { nombre:"PlayStation",  dominio:"playstation.com",    imagen:null },
  { nombre:"Xbox",         dominio:"xbox.com",           imagen:null },
  { nombre:"Canon",        dominio:"canon.com",          imagen:null },
  { nombre:"Nikon",        dominio:"nikon.com",          imagen:null },
  { nombre:"GoPro",        dominio:"gopro.com",          imagen:null },
  { nombre:"JBL",          dominio:"jbl.com",            imagen:null },
  { nombre:"Bose",         dominio:"bose.com",           imagen:null },
  { nombre:"Beats",        dominio:"beatsbydre.com",     imagen:null },
  { nombre:"Logitech",     dominio:"logitech.com",       imagen:null },
  { nombre:"Razer",        dominio:"razer.com",          imagen:null },
  { nombre:"Corsair",      dominio:"corsair.com",        imagen:null },
  { nombre:"DJI",          dominio:"dji.com",            imagen:null },
  { nombre:"Fitbit",       dominio:"fitbit.com",         imagen:null },
  { nombre:"Garmin",       dominio:"garmin.com",         imagen:null },
  { nombre:"Casio",        dominio:"casio.com",          imagen:null },
  { nombre:"Seiko",        dominio:"seikowatches.com",   imagen:null },
  { nombre:"Nike",         dominio:"nike.com",           imagen:null },
  { nombre:"Adidas",       dominio:"adidas.com",         imagen:null },
  { nombre:"Puma",         dominio:"puma.com",           imagen:null },
  { nombre:"Under Armour", dominio:"underarmour.com",    imagen:null },
  { nombre:"Levi's",       dominio:"levi.com",           imagen:null },
  { nombre:"Zara",         dominio:"zara.com",           imagen:null },
  { nombre:"H&M",          dominio:"hm.com",             imagen:null },
  { nombre:"Whirlpool",    dominio:"whirlpool.com",      imagen:null },
  { nombre:"Electrolux",   dominio:"electrolux.com",     imagen:null },
  { nombre:"Philips",      dominio:"philips.com",        imagen:null },
  { nombre:"Bosch",        dominio:"bosch.com",          imagen:null },
  { nombre:"Siemens",      dominio:"siemens.com",        imagen:null },
  { nombre:"Panasonic",    dominio:"panasonic.com",      imagen:null },
  { nombre:"TCL",          dominio:"tcl.com",            imagen:null },
  { nombre:"Hisense",      dominio:"hisense.com",        imagen:null },
  { nombre:"Lego",         dominio:"lego.com",           imagen:null },
  { nombre:"Hasbro",       dominio:"hasbro.com",         imagen:null },
  { nombre:"Mattel",       dominio:"mattel.com",         imagen:null },
  { nombre:"Barbie",       dominio:"barbie.com",         imagen:null },
];

function busquedaLocal(texto: string): MarcaSugerida[] {
  const q = texto.trim().toLowerCase();
  if (q.length < 1) return [];
  return MARCAS
    .map(m => ({ ...m, imagen: m.imagen ?? logoDeDominio(m.dominio) }))
    .filter(m => m.nombre.toLowerCase().includes(q))
    .sort((a, b) => {
      const ai = a.nombre.toLowerCase().startsWith(q) ? 0 : 1;
      const bi = b.nombre.toLowerCase().startsWith(q) ? 0 : 1;
      return ai - bi;
    })
    .slice(0, 8);
}

/**
 * QUÉ ES UNA MARCA, PARA ESTE BUSCADOR
 *
 * Una marca es un FABRICANTE CON DOMINIO. No es un resultado de búsqueda.
 *
 * Esto devolvía lo que Google contestaba tal cual, así que escribir "App"
 * traía "Apps en Google Play", "Aplicación móvil - Wikipedia" y "App móvil -
 * ¿Qué es una app? | SumUp Facturas". Son páginas que hablan del tema, no
 * marcas — y ninguna sirve para completar el campo Marca.
 *
 * Ahora el nombre sale del DOMINIO, no del título de la página:
 * `apple.com/es/app-store` es la marca "Apple", no "App Store - Apple (ES)".
 * Eso arregla de paso el logo, que se buscaba con el dominio de la página
 * encontrada en vez del de la marca.
 *
 * Y se filtra: si escribís "Apple", no pueden venir marcas que no tengan
 * "Apple" en el nombre. Una sugerencia que no se parece a lo que se escribió
 * no es una sugerencia.
 */

/** Dominios que nunca son una marca: son donde se habla DE las marcas. */
const NO_SON_MARCAS = new Set([
  "wikipedia.org", "es.wikipedia.org", "en.wikipedia.org",
  "google.com", "play.google.com", "youtube.com", "facebook.com",
  "instagram.com", "x.com", "twitter.com", "linkedin.com", "reddit.com",
  "amazon.com", "ebay.com", "aliexpress.com", "mercadolibre.com.uy",
  "mercadolibre.com", "pinterest.com", "tiktok.com", "quora.com",
]);

/**
 * El nombre de marca que corresponde a un dominio.
 * `apple.com` → "Apple". `underarmour.com` → "Underarmour".
 */
function marcaDeDominio(dominio: string): string {
  const raiz = dominio
    .replace(/^www\./, "")
    .replace(/\.(com|net|org|co|io|shop|store)(\.[a-z]{2})?$/, "")
    .split(".").pop() ?? dominio;
  return raiz.charAt(0).toUpperCase() + raiz.slice(1);
}

export async function buscarMarcas(texto: string): Promise<MarcaSugerida[]> {
  const q = texto.trim();
  if (q.length < 2) return [];
  const ql = q.toLowerCase();

  const web = await buscar(q, { incluirCanales: false });

  const porDominio = new Map<string, MarcaSugerida>();
  for (const r of web) {
    const dominio = dominioDeUrl(r.url);
    if (!dominio || NO_SON_MARCAS.has(dominio)) continue;

    const nombre = marcaDeDominio(dominio);
    // Lo tipeado tiene que estar en el nombre. Sin esto, buscar "Apple" trae
    // cualquier pagina donde aparezca la palabra.
    if (!nombre.toLowerCase().includes(ql) && !ql.includes(nombre.toLowerCase())) continue;

    // Un dominio, una marca: el mismo fabricante aparece en varias paginas.
    if (porDominio.has(dominio)) continue;
    porDominio.set(dominio, {
      nombre,
      imagen: logoDeDominio(dominio),
      dominio,
    });
  }

  // La lista local primero cuando coincide: son marcas verificadas, con su
  // dominio correcto, y le ganan a lo que adivine el buscador.
  const locales = busquedaLocal(q);
  const vistos = new Set(locales.map(m => m.dominio));
  const web2 = [...porDominio.values()].filter(m => !vistos.has(m.dominio));

  return [...locales, ...web2].slice(0, 8);
}

function dominioDeUrl(url: string | null): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
}

/**
 * URL del logo a partir del dominio de la marca.
 *
 * Con `VITE_LOGO_DEV_TOKEN` usa logo.dev, que devuelve el logotipo de verdad.
 * Sin la key —que es el caso hoy: no está cargada en el `.env`— cae al favicon
 * del propio dominio, que no necesita ninguna cuenta.
 *
 * El favicon es peor que el logotipo: es chico y a veces es un ícono y no la
 * marca. Pero devolver `null` dejaba el campo Logo SIEMPRE vacío, y un logo
 * modesto se entiende mejor que ninguno. Cargando la key, mejora solo.
 */
export function logoDeDominio(dominio: string | null): string | null {
  if (!dominio) return null;
  const token = (import.meta as any).env?.VITE_LOGO_DEV_TOKEN as string | undefined;
  if (token) return `https://img.logo.dev/${dominio}?token=${token}&fallback=404`;
  return `https://icons.duckduckgo.com/ip3/${dominio}.ico`;
}
