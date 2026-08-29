/**
 * CORE-TAX — tipos del dominio.
 *
 * QUÉ CLASIFICA ESTE MOTOR, Y QUÉ NO
 * Clasifica **el producto**: qué tasa le corresponde por lo que es. No responde
 * qué impuesto lleva una operación concreta — eso depende además del territorio
 * (una venta a zona franca es exenta sin importar el producto) y del tipo de
 * comprador. Si alguien le pide al motor la tasa de una venta, está haciendo la
 * pregunta equivocada al componente equivocado.
 *
 * NO SUSTITUYE CRITERIO PROFESIONAL. Sugiere, con su fundamento a la vista,
 * para que una persona decida más rápido.
 */

/** Versión del motor. Se guarda con cada clasificación para poder saber qué
 *  versión la produjo, y detectar las que quedaron atrás cuando cambia una regla. */
export const VERSION_MOTOR = "0.1.0";

/**
 * Qué tasa, por su código — no por su número.
 *
 * Devolver `10 | 22 | 0` metía la legislación uruguaya adentro del tipo: sumar
 * un país sería cambiar el tipo en toda la cadena. El número vive en la tabla
 * `tax_rates`, por país, que es donde se puede actualizar sin tocar código.
 *
 * Y hay una razón fiscal además de una de tipos: **exento no es 0%**. Son cosas
 * legalmente distintas —cambia el crédito fiscal del comprador— y `0` las
 * unifica. El código las conserva.
 */
export type CodigoTasa = "basica" | "minima" | "exento";

/**
 * Cuánta certeza hay.
 *
 * ALTA exige DOS señales coincidentes (nombre y categoría). Una sola nunca
 * alcanza: "arroz" en el nombre también aparece en "vinagre de arroz" y en
 * "papel de arroz", y ALTA es justamente lo que invita a aplicar sin mirar.
 */
export type Confianza = "ALTA" | "MEDIA" | "BAJA";

export type EstadoClasificacion =
  /** El motor clasificó solo. */
  | "SUGGESTED"
  /** Alguien aceptó la sugerencia como válida. */
  | "CONFIRMED"
  /** Alguien puso la tasa a mano. No se pisa con una corrida nueva. */
  | "MANUAL"
  /** Señales contradictorias o insuficientes. El motor NO inventa. */
  | "REVIEW_REQUIRED";

/**
 * De dónde sale una regla.
 *
 * `verificado` no es decoración: dice si un profesional confirmó la referencia.
 * Una cita legal inventada es peor que ninguna, porque se ve igual de sólida.
 * Mientras esté en `false`, la interfaz tiene que decirlo.
 */
export interface FuenteNormativa {
  id: string;
  /** Cómo se cita. */
  referencia: string;
  /** Qué dice, en una línea. */
  resumen: string;
  /** Confirmada por un profesional. */
  verificado: boolean;
  /** Desde cuándo rige esta redacción, si se sabe. */
  vigenteDesde?: string;
}

/** Una señal que el motor puede leer del producto. */
export type CampoSenal = "nombre" | "categoria";

export interface Regla {
  /** Identificador estable. Se guarda con la clasificación. */
  id: string;
  codigoTasa: CodigoTasa;
  /** Id en el registro de fuentes. */
  fuente: string;
  /** Por qué, en palabras de quien va a leerlo. */
  razon: string;
  /** Coincidencias en el nombre del producto. */
  nombre?: RegExp[];
  /** Coincidencias en la categoría. */
  categoria?: RegExp[];
  /**
   * Si alguna de estas aparece, la regla NO aplica.
   *
   * Es lo que separa "arroz" de "vinagre de arroz". Sin descartes, cada regla
   * de alimentos arrastra media docena de productos que no son ese alimento.
   */
  descarta?: RegExp[];
}

/** Lo que se le manda al motor. */
export interface ProductoAClasificar {
  nombre: string;
  categoria?: string;
  descripcion?: string;
  marca?: string;
  sku?: string;
  /** Nomenclatura arancelaria. No se usa todavía; se acepta para no cambiar la
   *  firma cuando exista. */
  ncm?: string;
}

/** Lo que devuelve. */
export interface Clasificacion {
  /** País cuya legislación se aplicó. */
  pais: string;
  /** Qué tasa. `null` cuando el motor no se anima a decidir. */
  codigoTasa: CodigoTasa | null;
  estado: EstadoClasificacion;
  confianza: Confianza;
  /** Id de la regla que ganó, o de todas las que empataron en un conflicto. */
  reglas: string[];
  razon: string;
  fuente: FuenteNormativa | null;
  versionMotor: string;
}
