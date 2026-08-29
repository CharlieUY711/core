/**
 * Alineación de números — regla única del panel.
 *
 * LA REGLA
 * Todo valor numérico va alineado a la derecha. Sin excepciones: precios,
 * stock, porcentajes, métricas, cantidades, tasas.
 *
 * POR QUÉ
 * Un número se lee de atrás para adelante — unidades, decenas, centenas. Con
 * los números a la izquierda, las unidades caen en un lugar distinto según
 * cuántos dígitos tenga cada uno, y una columna de importes deja de poder
 * compararse de un vistazo: hay que leer cada cifra entera para saber cuál es
 * mayor. A la derecha, la magnitud se ve por el largo.
 *
 * `tabular-nums` va siempre junto: sin él los dígitos tienen anchos distintos
 * (el 1 es más angosto que el 8), así que el número se corre mientras se
 * escribe y las columnas no terminan de alinear aunque estén a la derecha.
 *
 * POR QUÉ ESTÁ ACÁ Y NO ESCRITO EN CADA CAMPO
 * Estaba escrito en cada campo, y por eso siete de nueve inputs numéricos no
 * lo tenían. Una convención que hay que recordar en cada archivo nuevo no es
 * una regla: es una intención. Acá es un import, y `scripts/check-numeros.mjs`
 * —que corre en `agent:verify`— falla si aparece un `type="number"` que no lo
 * use.
 *
 * CÓMO SE USA
 *   <input type="number" style={{ ...inp, ...NUMERICO }} />
 *   <td style={{ ...td, ...NUMERICO }}>{precio}</td>
 *
 * Para un `<select>` que muestra un número usar `NUMERICO_SELECT`: necesita
 * lugar a la derecha para su flecha, y si no el valor le queda encima.
 */
import type { CSSProperties } from "react";

export const NUMERICO: CSSProperties = {
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

/**
 * Igual, para selects.
 *
 * El navegador dibuja la flecha pegada al borde derecho y no la considera
 * parte del contenido, así que un valor alineado a la derecha le queda
 * encima. El padding le hace lugar.
 */
export const NUMERICO_SELECT: CSSProperties = {
  ...NUMERICO,
  paddingRight: 18,
};
