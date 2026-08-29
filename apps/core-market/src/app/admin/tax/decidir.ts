/**
 * Qué hacer con una sugerencia de CORE-TAX.
 *
 * POR QUÉ ESTO ES UNA FUNCIÓN PURA Y NO CÓDIGO ADENTRO DEL COMPONENTE
 * Es la regla de negocio de la integración —cuándo se crea una excepción y
 * cuándo no— y es lo único de todo esto que puede estar mal de una forma
 * silenciosa: crear una excepción que no hacía falta no rompe nada visible, y
 * deja al artículo con una copia de la tasa que después nadie sabe si fue una
 * decisión. Separada, se puede probar.
 *
 * NO VIVE EN CORE-TAX: el motor no debe saber que existe una taxonomía con
 * herencia, que es una cosa de MARKET.
 *
 * LA REGLA, EN UNA LÍNEA
 * La taxonomía sigue siendo la fuente. El motor sólo materializa una excepción
 * cuando DIFIERE de ella; cuando coincide, confirma y el artículo sigue
 * heredando.
 */
import type { Clasificacion, CodigoTasa } from "@core/tax";

/** Lo que el artículo tiene hoy. */
export interface EstadoFiscal {
  /** Tasa que hereda de su taxonomía. Siempre hay una: el país tiene default. */
  heredada: CodigoTasa;
  /** Excepción declarada en el artículo, si tiene. */
  excepcion: CodigoTasa | null;
  /** De dónde salió lo que hay. `null` = nunca se clasificó. */
  origen: "SUGGESTED" | "CONFIRMED" | "MANUAL" | "REVIEW_REQUIRED" | null;
}

export type Accion =
  /** Coincide con la taxonomía: se confirma y NO se crea excepción. */
  | "CONFIRMAR_HERENCIA"
  /** Difiere: se materializa la excepción en el artículo. */
  | "CREAR_EXCEPCION"
  /** El motor no se animó: se avisa y decide una persona. */
  | "PEDIR_REVISION"
  /** Hay una decisión manual: no se toca sin que el usuario lo pida. */
  | "RESPETAR_MANUAL"
  /** Faltan datos: ni siquiera se corre el motor. */
  | "SIN_DATOS";

export interface Decision {
  accion: Accion;
  /** Qué guardar en `tax_rate_id`. `null` significa "que siga heredando". */
  tasaAGuardar: CodigoTasa | null;
  /** Qué guardar en `tax_source`. */
  origen: "SUGGESTED" | "CONFIRMED" | "MANUAL" | "REVIEW_REQUIRED" | null;
  /** Para mostrar. */
  mensaje: string;
}

/** ¿Hay con qué clasificar? Sin nombre y categoría no se corre el motor. */
export const hayDatosSuficientes = (nombre?: string, categoria?: string): boolean =>
  !!nombre?.trim() && !!categoria?.trim();

/**
 * Decide, sin tocar nada.
 *
 * `forzar` es el usuario diciendo "sí, reemplazá mi decisión manual". Sin eso,
 * lo manual gana siempre — que es el punto: una corrida del motor no puede
 * borrar lo que decidió una persona.
 */
export function decidir(
  sugerencia: Clasificacion,
  estado: EstadoFiscal,
  forzar = false,
): Decision {
  if (estado.origen === "MANUAL" && !forzar) {
    return {
      accion: "RESPETAR_MANUAL",
      tasaAGuardar: estado.excepcion,
      origen: "MANUAL",
      mensaje:
        "Este artículo tiene una tasa puesta a mano. La sugerencia no la " +
        "reemplaza sola: si querés aplicarla, confirmalo.",
    };
  }

  if (sugerencia.estado === "REVIEW_REQUIRED" || sugerencia.codigoTasa === null) {
    return {
      accion: "PEDIR_REVISION",
      // No se toca la excepción que hubiera: pedir revisión no es cambiar nada.
      tasaAGuardar: estado.excepcion,
      origen: "REVIEW_REQUIRED",
      mensaje: sugerencia.razon,
    };
  }

  if (sugerencia.codigoTasa === estado.heredada) {
    return {
      accion: "CONFIRMAR_HERENCIA",
      // NULL a propósito: coincidir con la taxonomía no justifica una copia.
      // Materializarla igual dejaría al artículo sin poder seguir a su
      // categoría cuando esa cambie.
      tasaAGuardar: null,
      origen: "CONFIRMED",
      mensaje:
        `Coincide con lo que ya dice su categoría (${etiqueta(estado.heredada)}). ` +
        "El artículo sigue heredando; no hace falta una excepción.",
    };
  }

  return {
    accion: "CREAR_EXCEPCION",
    tasaAGuardar: sugerencia.codigoTasa,
    origen: "SUGGESTED",
    mensaje:
      `Su categoría dice ${etiqueta(estado.heredada)} y el motor sugiere ` +
      `${etiqueta(sugerencia.codigoTasa)}. Aplicarlo deja una excepción en este artículo.`,
  };
}

const etiqueta = (c: CodigoTasa): string =>
  c === "basica" ? "Básica" : c === "minima" ? "Mínima" : "Exento";
