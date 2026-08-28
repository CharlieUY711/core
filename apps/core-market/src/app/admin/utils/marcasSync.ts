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
    .filter(m => m.nombre.toLowerCase().includes(q))
    .sort((a, b) => {
      const ai = a.nombre.toLowerCase().startsWith(q) ? 0 : 1;
      const bi = b.nombre.toLowerCase().startsWith(q) ? 0 : 1;
      return ai - bi;
    })
    .slice(0, 8);
}

/**
 * Marcas sugeridas para un texto. Intenta la búsqueda web unificada primero;
 * si no trae nada (sin key, sin conexión, error del proveedor), cae a la
 * lista local para no dejar el campo sin sugerencias.
 */
export async function buscarMarcas(texto: string): Promise<MarcaSugerida[]> {
  if (texto.trim().length < 2) return [];
  const web = await buscar(texto, { incluirCanales: false });
  if (web.length > 0) {
    return web.map(r => ({
      nombre:  r.nombre,
      imagen:  r.imagen ?? logoDeDominio(dominioDeUrl(r.url)),
      dominio: dominioDeUrl(r.url),
    }));
  }
  return busquedaLocal(texto);
}

function dominioDeUrl(url: string | null): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
}

/** URL de logo a partir del dominio adivinado. null si no hay dominio o no hay key cargada. */
export function logoDeDominio(dominio: string | null): string | null {
  if (!dominio) return null;
  const token = (import.meta as any).env?.VITE_LOGO_DEV_TOKEN as string | undefined;
  if (!token) return null; // sin key no se arma la URL: mejor "sin logo" que una que nunca va a cargar
  return `https://img.logo.dev/${dominio}?token=${token}&fallback=404`;
}
