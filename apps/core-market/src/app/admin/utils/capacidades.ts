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
 * LAS DOS SON DISTINTAS, Y SE VENDEN DISTINTO
 *   BUSCADOR   — completar el alta con lo que hay en la web: marca, logo,
 *                artículo, fotos, videos. Consume búsquedas.
 *   CATALOGO   — además, LEER el catálogo del fabricante o de su representante
 *                local y cargar productos de a varios. Consume búsquedas, el
 *                proxy y un modelo de lenguaje, así que cuesta bastante más.
 *
 * Catálogo implica Buscador: leer un catálogo empieza por encontrar la marca.
 */

export type Capacidad = "buscador" | "catalogo";

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
export const puedeBuscarEnLaWeb = () => tieneCapacidad("buscador");
export const puedeLeerCatalogos = () =>
  tieneCapacidad("catalogo") && tieneCapacidad("buscador");
