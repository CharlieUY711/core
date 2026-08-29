/**
 * Registro de fuentes normativas.
 *
 * POR QUÉ UN REGISTRO Y NO UN STRING EN CADA REGLA
 * Repetir la cita en veinte reglas obliga a actualizarla en veinte lugares
 * cuando la ley se modifica o se renumera. Acá se cambia en una y todas las
 * reglas que la citan quedan al día.
 *
 * `verificado: false` ES DELIBERADO Y ES IMPORTANTE
 * Las referencias de abajo indican el cuerpo normativo correcto, pero el
 * artículo y numeral exactos NO están confirmados por un profesional. Una cita
 * legal inventada es peor que ninguna: se ve igual de sólida y nadie la
 * cuestiona. Mientras el campo esté en `false`, el motor lo devuelve y la
 * interfaz tiene que mostrarlo — "fundamento pendiente de verificación" — en
 * vez de presentarlo como un hecho.
 *
 * Confirmarlas es trabajo de un contador, no de quien escribe el motor. El día
 * que se confirmen, se cambia el `false` acá y nada más.
 */
import type { FuenteNormativa } from "../domain/tipos";

export const FUENTES: Record<string, FuenteNormativa> = {
  IVA_TASA_MINIMA: {
    id: "IVA_TASA_MINIMA",
    referencia: "Título 10, Texto Ordenado 1996 — tasa mínima del IVA",
    resumen:
      "Enumera los bienes y servicios gravados a la tasa mínima. Incluye un " +
      "conjunto de alimentos de primera necesidad y medicamentos.",
    verificado: false,
  },
  IVA_TASA_BASICA: {
    id: "IVA_TASA_BASICA",
    referencia: "Título 10, Texto Ordenado 1996 — tasa básica del IVA",
    resumen:
      "Tasa general. Aplica a todo lo gravado que no esté comprendido en la " +
      "tasa mínima ni exonerado.",
    verificado: false,
  },
  IVA_EXONERACIONES: {
    id: "IVA_EXONERACIONES",
    referencia: "Título 10, Texto Ordenado 1996 — exoneraciones",
    resumen:
      "Bienes y servicios exonerados. Exonerado no es tasa 0%: cambia el " +
      "tratamiento del crédito fiscal.",
    verificado: false,
  },
};

/** La fuente, o null si la regla cita una que no existe. */
export const fuenteDe = (id: string): FuenteNormativa | null => FUENTES[id] ?? null;

/** ¿Hay alguna fuente sin confirmar? Sirve para avisarlo una sola vez. */
export const hayFuentesSinVerificar = (): boolean =>
  Object.values(FUENTES).some((f) => !f.verificado);
