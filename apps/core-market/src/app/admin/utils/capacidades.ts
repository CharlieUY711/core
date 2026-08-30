/**
 * Qué funcionalidades tiene habilitadas esta tienda.
 *
 * POR QUÉ EXISTE ESTE ARCHIVO HOY, SI TODAVÍA NO HAY CONFIGURADOR
 * Porque el día que exista, la diferencia entre "se cambia acá" y "hay que
 * buscar en quince lugares" ya está tomada. Estas dos funcionalidades se
 * consultan desde varios puntos de la ficha del artículo; si cada uno decide
 * por su cuenta, activarlas o desactivarlas por tienda deja de ser una
 * configuración y pasa a ser un refactor.
 *
 * YA SE CONFIGURA
 * `stores.capacidades` existe y lo llena el configurador de tiendas de CORE
 * Market. Esta función lee de ahí, que es exactamente lo que decía el
 * `TODO(configurador)` que estuvo acá desde el principio.
 *
 * BUSCAR EN LA PROPIA BIBLIOTECA NO ES UNA CAPACIDAD
 * Es de la tienda y siempre está: son sus fichas, las que fue cargando. No se
 * cobra ni se apaga el acceso a los datos de uno. Por eso no aparece acá — si
 * estuviera, alguien podría desactivarla, y eso no tiene sentido.
 *
 * LO QUE SÍ SE CONFIGURA, Y SE VENDE DISTINTO
 *   BUSQUEDA_AMPLIADA — salir a la web a completar el alta: marca, logo,
 *                       artículo, fotos, videos. Consume búsquedas.
 *   CATALOGO_POR_MARCA — leer el catálogo del fabricante o de su representante
 *                       local y cargar de a varios. Consume búsquedas, el
 *                       proxy y un modelo de lenguaje: cuesta bastante más.
 *
 * Catálogo implica Búsqueda ampliada: leer un catálogo empieza por encontrar
 * la marca y su representante.
 */

import { supabase } from "../../../utils/supabase/client";

export type Capacidad = "busqueda_ampliada" | "catalogo_por_marca";

/**
 * Lo que la tienda tiene habilitado, leído una vez.
 *
 * POR QUÉ UNA CACHÉ Y NO UNA CONSULTA POR PREGUNTA
 * Porque esto se consulta desde varios puntos de la ficha del artículo, a
 * veces dentro de un render. Una consulta por pregunta serían decenas de
 * viajes a la base para responder algo que no cambia mientras dura la sesión:
 * habilitar una capacidad es un acto del configurador, no algo que pase solo.
 */
let habilitadas: Set<Capacidad> | null = null;

/**
 * Trae las capacidades de la tienda. Se llama una vez, al entrar al panel.
 *
 * Si falla, `habilitadas` queda en null y todo sigue habilitado. Es a
 * propósito: un error de red no puede apagarle funcionalidades a alguien que
 * las tiene contratadas. Se prefiere fallar hacia lo que el usuario espera y
 * dejar el aviso en la consola, antes que hacerle creer que perdió algo.
 */
export async function cargarCapacidades(): Promise<void> {
  const { data, error } = await supabase.rpc("mis_capacidades");
  if (error) {
    console.warn("[capacidades] no se pudieron leer:", error.message);
    habilitadas = null;
    return;
  }
  habilitadas = new Set((data ?? []) as Capacidad[]);
}

/**
 * ¿La tienda tiene esta capacidad?
 *
 * Antes de que carguen, y si la lectura falló, devuelve `true` — ver arriba.
 */
export function tieneCapacidad(c: Capacidad): boolean {
  if (habilitadas === null) return true;
  return habilitadas.has(c);
}

/** Atajos, para que quien los use no tenga que acordarse del nombre. */
export const puedeBuscarEnLaWeb = () => tieneCapacidad("busqueda_ampliada");
export const puedeLeerCatalogos = () =>
  tieneCapacidad("catalogo_por_marca") && tieneCapacidad("busqueda_ampliada");

/**
 * La Biblioteca propia siempre se puede consultar.
 *
 * Existe como función —y no como un `true` escrito en cada lugar— para que
 * quede claro que la decisión está tomada y no es un olvido.
 */
export const puedeBuscarEnBiblioteca = () => true;

/**
 * Las capacidades que existen, con su nombre visible y qué implican.
 *
 * Vive acá y no en la pantalla del configurador para que agregar una capacidad
 * sea un solo cambio: si la lista estuviera en el formulario, el día que
 * aparezca una nueva habría que acordarse de dos lugares — y el que se olvida
 * siempre es el formulario, así que la capacidad existiría sin poder
 * habilitarse.
 */
export const CAPACIDADES: { id: Capacidad; label: string; detalle: string }[] = [
  { id: "busqueda_ampliada",  label: "Búsqueda ampliada",
    detalle: "Salir a la web para completar el alta: marca, logo, artículo, fotos, videos. Consume búsquedas." },
  { id: "catalogo_por_marca", label: "Catálogo por marca",
    detalle: "Leer el catálogo del fabricante o de su representante local y cargar de a varios. Consume búsquedas, el proxy y un modelo de lenguaje." },
];

/**
 * Las vidrieras de la plataforma.
 *
 * Son de la publicación, no de la tienda: una tienda vende en las dos. Acá se
 * declara en cuáles PUEDE publicar, que es otra pregunta.
 *
 * Los valores son los que ya usa `catalog_producto_base.tipo` — no se inventa
 * un vocabulario nuevo para lo mismo.
 */
export const VIDRIERAS: { id: string; label: string }[] = [
  { id: "market",     label: "Market" },
  { id: "secondhand", label: "Second" },
];
