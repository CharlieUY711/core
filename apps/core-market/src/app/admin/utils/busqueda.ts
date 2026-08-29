/**
 * `buscar()` — la única función de búsqueda de la app.
 *
 * Antes había una lista curada local para marca y un motor aparte (Mercado
 * Libre) para artículo. Se unifican acá para no terminar con una función de
 * búsqueda por campo, y para que la fuente principal sea la web abierta
 * (Serper.dev, resultados de Google) y no un catálogo de un canal en
 * particular — si no, la experiencia termina pareciéndose a la de ese canal.
 *
 * Orden de resultados: la web primero, los canales conectados (Mercado
 * Libre y los que se sumen) después, como apoyo — nunca al revés.
 */
import { invocar, buscarProductos } from "./canalesSync";

export interface ResultadoBusqueda {
  nombre: string;
  imagen: string | null;
  url: string | null;
  descripcion: string | null;
  /** "web" (Serper/Google), el canal que lo aportó, o el dominio que se leyó. */
  fuente: string;
  /**
   * Precio publicado en la fuente, si la trajo.
   *
   * Lo trae el catálogo del representante oficial, que publica sus precios.
   * Una búsqueda web no: sus resultados son páginas, no precios.
   */
  precio?: number | null;
  moneda?: string | null;
}

async function buscarWeb(texto: string, tipo: "web" | "images" | "videos" = "web"): Promise<ResultadoBusqueda[]> {
  try {
    const d = await invocar("buscar-web", { query: texto, tipo });
    // La función devuelve 200 aun cuando falla (sin key, Serper caído, etc.)
    // y viaja el motivo en `error`. Antes se descartaba en silencio; ahora
    // queda en la consola para poder distinguir "no hay resultados" de
    // "la función no está desplegada o no tiene la key cargada".
    if (d?.error) { console.warn("[buscar-web]", d.error); return []; }
    if (!d?.resultados) return [];
    return d.resultados as ResultadoBusqueda[];
  } catch (err) {
    console.warn("[buscar-web] no se pudo llamar a la función:", err);
    return [];
  }
}

/**
 * Búsqueda unificada. `incluirCanales` trae además lo que sepan los canales
 * conectados (hoy Mercado Libre) — tiene sentido para "artículo" (donde
 * interesa precio/ficha de mercado) y no para "marca" (donde un canal de
 * venta no aporta nada que la web no tenga).
 */
export async function buscar(
  texto: string,
  opts: { incluirCanales?: boolean } = {},
): Promise<ResultadoBusqueda[]> {
  const q = texto.trim();
  if (q.length < 2) return [];

  const [web, canales] = await Promise.all([
    buscarWeb(q),
    opts.incluirCanales ? buscarProductos(q) : Promise.resolve([]),
  ]);

  const deCanales: ResultadoBusqueda[] = canales.map(p => ({
    nombre: p.nombre,
    imagen: p.imagen,
    url: null,
    descripcion: p.rasgos.join(" · ") || null,
    fuente: p.canalNombre,
  }));

  // Web primero, canales atrás, sin repetir el mismo nombre dos veces.
  const vistos = new Set<string>();
  const combinado: ResultadoBusqueda[] = [];
  for (const r of [...web, ...deCanales]) {
    const clave = r.nombre.toLowerCase().replace(/\s+/g, " ").trim();
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    combinado.push(r);
  }
  return combinado.slice(0, 10);
}

/**
 * Imágenes de la web para un texto (marca + artículo, típicamente). Mismo
 * motor que `buscar()` pero contra el endpoint de imágenes de Serper, así
 * que trae fotos del producto y no páginas que lo mencionan.
 */
export async function buscarImagenes(texto: string): Promise<ResultadoBusqueda[]> {
  const q = texto.trim();
  if (q.length < 2) return [];
  return buscarWeb(q, "images");
}

/**
 * Videos de la web para un texto (marca + artículo, típicamente). Mismo
 * motor que `buscar()` pero contra el endpoint de videos de Serper.
 */
export async function buscarVideos(texto: string): Promise<ResultadoBusqueda[]> {
  const q = texto.trim();
  if (q.length < 2) return [];
  return buscarWeb(q, "videos");
}
