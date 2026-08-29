/**
 * Las reglas, separadas del motor.
 *
 * Agregar un caso es agregar una entrada acá. La lógica de cómo se combinan
 * —cuántas señales hacen falta, qué pasa si dos reglas se contradicen— vive en
 * `application/clasificarProducto.ts` y no cambia.
 *
 * SOBRE `descarta`
 * Es lo que separa "arroz" de "vinagre de arroz" y de "papel de arroz". Sin
 * descartes, cada regla de alimentos se lleva puesta media docena de productos
 * que comparten la palabra y no el tratamiento. Es el mecanismo que hace
 * honesta a la confianza ALTA.
 *
 * ADVERTENCIA
 * Esta tabla es un punto de partida conservador, no una clasificación fiscal
 * completa ni revisada. Los casos dudosos NO se agregan: quedan sin regla y
 * caen en la tasa básica, que es el default correcto en Uruguay. Inventar una
 * regla para cubrir un caso que no se conoce bien es exactamente lo que el
 * principio conservador prohíbe.
 */
import type { Regla } from "../domain/tipos";

/** Palabras que aparecen en productos que NO son el alimento, aunque lo nombren. */
const NO_ES_EL_ALIMENTO = [
  /\bvinagre\b/i, /\bpapel\b/i, /\besencia\b/i, /\bperfume\b/i,
  /\bjuguete\b/i, /\bdecorativ/i, /\bvela\b/i, /\baroma/i,
];

export const REGLAS: Regla[] = [
  // ── Alimentos a tasa mínima ─────────────────────────────────────────────
  {
    id: "FOOD_ARROZ",
    codigoTasa: "minima",
    fuente: "IVA_TASA_MINIMA",
    razon: "Producto identificado como arroz",
    nombre: [/\barroz\b/i],
    categoria: [/aliment|almac[eé]n|comestible/i],
    descarta: NO_ES_EL_ALIMENTO,
  },
  {
    id: "FOOD_PAN",
    codigoTasa: "minima",
    fuente: "IVA_TASA_MINIMA",
    razon: "Producto identificado como pan o galleta",
    nombre: [/\bpan\b/i, /\bgalleta\b/i],
    categoria: [/aliment|panader|almac[eé]n/i],
    descarta: [...NO_ES_EL_ALIMENTO, /\bpan\s*de\s*(oro|plata)\b/i, /\brallado\b/i],
  },
  {
    id: "FOOD_FIDEOS",
    codigoTasa: "minima",
    fuente: "IVA_TASA_MINIMA",
    razon: "Producto identificado como fideos o pastas",
    nombre: [/\bfideo/i, /\bpasta[s]?\b/i, /\bspaghetti\b/i, /\btallarin/i],
    categoria: [/aliment|almac[eé]n|comestible/i],
    // "pasta" también es pasta dental, pasta de soldar, pasta base de pintura.
    descarta: [...NO_ES_EL_ALIMENTO, /\bdental\b/i, /\bdientes\b/i, /\bsoldar\b/i, /\bmuro\b/i],
  },
  {
    id: "FOOD_HARINA",
    codigoTasa: "minima",
    fuente: "IVA_TASA_MINIMA",
    razon: "Producto identificado como harina de cereal",
    nombre: [/\bharina\b/i],
    categoria: [/aliment|almac[eé]n|comestible/i],
    descarta: NO_ES_EL_ALIMENTO,
  },
  {
    id: "FOOD_AZUCAR",
    codigoTasa: "minima",
    fuente: "IVA_TASA_MINIMA",
    razon: "Producto identificado como azúcar",
    nombre: [/\baz[uú]car\b/i],
    categoria: [/aliment|almac[eé]n|comestible/i],
    descarta: NO_ES_EL_ALIMENTO,
  },
  {
    id: "FOOD_YERBA",
    codigoTasa: "minima",
    fuente: "IVA_TASA_MINIMA",
    razon: "Producto identificado como yerba mate",
    nombre: [/\byerba\b/i],
    categoria: [/aliment|almac[eé]n|comestible/i],
    descarta: NO_ES_EL_ALIMENTO,
  },
  {
    id: "FOOD_CAFE",
    codigoTasa: "minima",
    fuente: "IVA_TASA_MINIMA",
    razon: "Producto identificado como café",
    nombre: [/\bcaf[eé]\b/i],
    categoria: [/aliment|almac[eé]n|comestible/i],
    // Una cafetera no es café.
    descarta: [...NO_ES_EL_ALIMENTO, /\bcafetera\b/i, /\bm[aá]quina\b/i, /\bfiltro/i],
  },
  {
    id: "FOOD_TE",
    codigoTasa: "minima",
    fuente: "IVA_TASA_MINIMA",
    razon: "Producto identificado como té",
    nombre: [/\bt[eé]\b/i, /\bt[eé]\s+en\s+saquitos\b/i],
    categoria: [/aliment|almac[eé]n|comestible/i],
    descarta: NO_ES_EL_ALIMENTO,
  },
  {
    id: "FOOD_ACEITE",
    codigoTasa: "minima",
    fuente: "IVA_TASA_MINIMA",
    razon: "Producto identificado como aceite comestible",
    nombre: [/\baceite\b/i],
    categoria: [/aliment|almac[eé]n|comestible/i],
    // Aceite de motor, de linaza, corporal: no son comestibles.
    descarta: [
      ...NO_ES_EL_ALIMENTO,
      /\bmotor\b/i, /\blubricante\b/i, /\bcorporal\b/i, /\bcapilar\b/i,
      /\bmasaje\b/i, /\blinaza\b/i, /\bcadena\b/i,
    ],
  },
  {
    id: "FOOD_CARNE",
    codigoTasa: "minima",
    fuente: "IVA_TASA_MINIMA",
    razon: "Producto identificado como carne",
    nombre: [/\bcarne\b/i, /\basado\b/i, /\bpollo\b/i, /\bmilanesa/i],
    categoria: [/carnicer|aliment|comestible/i],
    descarta: [...NO_ES_EL_ALIMENTO, /\bsoja\b/i, /\bvegetal\b/i, /\bveganm?/i],
  },
  {
    id: "FOOD_PESCADO",
    codigoTasa: "minima",
    fuente: "IVA_TASA_MINIMA",
    razon: "Producto identificado como pescado",
    nombre: [/\bpescado\b/i, /\bmerluza\b/i, /\bat[uú]n\b/i, /\bsalm[oó]n\b/i],
    categoria: [/pescader|aliment|comestible/i],
    descarta: NO_ES_EL_ALIMENTO,
  },

  // ── Medicamentos ────────────────────────────────────────────────────────
  {
    id: "MEDICINE",
    codigoTasa: "minima",
    fuente: "IVA_TASA_MINIMA",
    razon: "Producto identificado como medicamento o especialidad farmacéutica",
    nombre: [/\bmedicamento\b/i, /\bcomprimido/i, /\bjarabe\b/i],
    categoria: [/farmac|medicament|salud/i],
    descarta: NO_ES_EL_ALIMENTO,
  },

  // ── Exonerados ──────────────────────────────────────────────────────────
  {
    id: "EXENTO_LIBROS",
    codigoTasa: "exento",
    fuente: "IVA_EXONERACIONES",
    razon: "Producto identificado como libro, diario o revista",
    nombre: [/\blibro\b/i, /\bdiario\b/i, /\brevista\b/i],
    categoria: [/librer|libro|editorial/i],
    // Un libro de actas o una agenda son artículos de papelería.
    descarta: [/\bactas\b/i, /\bagenda\b/i, /\bcaja\b/i, /\bfunda\b/i],
  },

  // ── Señales positivas de tasa básica ────────────────────────────────────
  // No cambian el resultado -sin regla ya cae en básica- pero SÍ la confianza:
  // "esto es electrónica" es evidencia, "no coincidió nada" no lo es.
  {
    id: "STANDARD_ELECTRONICA",
    codigoTasa: "basica",
    fuente: "IVA_TASA_BASICA",
    razon: "Producto de electrónica, gravado a la tasa general",
    nombre: [/\bnotebook\b/i, /\bcelular\b/i, /\bsmartphone\b/i, /\btelevisor\b/i,
             /\btablet\b/i, /\bmonitor\b/i, /\biphone\b/i, /\blaptop\b/i],
    categoria: [/electr[oó]nic|inform[aá]tic|tecnolog/i],
  },
  {
    id: "STANDARD_INDUMENTARIA",
    codigoTasa: "basica",
    fuente: "IVA_TASA_BASICA",
    razon: "Producto de indumentaria, gravado a la tasa general",
    categoria: [/indumentaria|vestimenta|ropa|calzado/i],
  },
];
