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
 * NO ESTÁ CONFIGURADO TODAVÍA, Y ESO SE DICE
 * `stores` no tiene columnas para esto —hoy sólo id, código, nombre, tipo,
 * owner y activo— así que no hay de dónde leer. Todo devuelve habilitado. Esto
 * es una costura, no una funcionalidad: fingir que ya se puede configurar
 * sería peor que no tenerla.
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

export type Capacidad = "busqueda_ampliada" | "catalogo_por_marca";

/**
 * ¿La tienda tiene esta capacidad?
 *
 * Cuando exista el configurador, esta función lee de ahí y nada más cambia.
 * Mientras tanto devuelve `true`, que es el comportamiento actual.
 */
export function tieneCapacidad(_c: Capacidad): boolean {
  // TODO(configurador): leer de la configuración de la tienda.
  // Hasta entonces todo habilitado, que es como viene funcionando.
  return true;
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
