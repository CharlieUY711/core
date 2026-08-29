/**
 * CORE-TAX — motor de clasificación fiscal.
 *
 * Una sola operación pública: `clasificarProducto`. No se agregan APIs que no
 * hagan falta todavía.
 *
 * MARKET es el primer consumidor, no el dueño: acá no hay nada específico de
 * MARKET, y no debe haberlo.
 */
export { clasificarProducto } from "./application/clasificarProducto";
export { VERSION_MOTOR } from "./domain/tipos";
export { FUENTES, fuenteDe, hayFuentesSinVerificar } from "./rules/fuentes";
export { REGLAS } from "./rules/reglas";
export type {
  Clasificacion, ProductoAClasificar, CodigoTasa, Confianza,
  EstadoClasificacion, FuenteNormativa, Regla,
} from "./domain/tipos";
