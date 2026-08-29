/**
 * Clasificar un producto.
 *
 * CÓMO DECIDE, EN ORDEN
 *   1. Se prueban todas las reglas. Una regla aplica si coincide alguna de sus
 *      señales y ninguno de sus descartes.
 *   2. Si dos reglas aplican con tasas distintas → REVIEW_REQUIRED. El motor no
 *      elige entre dos respuestas contradictorias: avisa que hay que mirarlo.
 *   3. Si aplica una sola tasa, gana. La confianza sale de cuántas señales
 *      coincidieron.
 *   4. Si no aplica ninguna → tasa básica, que es el default correcto en
 *      Uruguay, con confianza MEDIA. "No coincidió nada" no es evidencia
 *      fuerte; que sea el default más probable no lo vuelve una certeza.
 *
 * LA CONFIANZA ALTA EXIGE DOS SEÑALES
 * Nombre y categoría. Una sola nunca alcanza: "arroz" también está en "vinagre
 * de arroz", y ALTA es justamente lo que invita a aplicar sin mirar. Es la
 * diferencia entre un motor que ayuda y uno que mete errores rápido.
 */
import type {
  Clasificacion, ProductoAClasificar, Regla, CodigoTasa, Confianza,
} from "../domain/tipos";
import { VERSION_MOTOR } from "../domain/tipos";
import { REGLAS } from "../rules/reglas";
import { fuenteDe } from "../rules/fuentes";

const PAIS_POR_DEFECTO = "UY";

interface Coincidencia {
  regla: Regla;
  /** Cuántas señales distintas coincidieron: 1 o 2. */
  senales: number;
}

const alguna = (patrones: RegExp[] | undefined, texto: string): boolean =>
  !!patrones?.some((p) => p.test(texto));

/**
 * ¿Aplica esta regla?
 *
 * Los descartes se evalúan sobre el nombre Y la categoría juntos: "aceite de
 * motor" descarta por el nombre, "aceite" en la categoría "automotor" descarta
 * por la categoría. Mirar sólo uno deja pasar la mitad de los casos.
 */
function evaluar(regla: Regla, nombre: string, categoria: string): Coincidencia | null {
  const todo = `${nombre} ${categoria}`;
  if (alguna(regla.descarta, todo)) return null;

  const porNombre    = alguna(regla.nombre, nombre);
  const porCategoria = alguna(regla.categoria, categoria);
  const senales = (porNombre ? 1 : 0) + (porCategoria ? 1 : 0);

  return senales > 0 ? { regla, senales } : null;
}

export function clasificarProducto(p: ProductoAClasificar): Clasificacion {
  const nombre    = (p.nombre ?? "").trim();
  const categoria = (p.categoria ?? "").trim();

  const base = {
    pais: PAIS_POR_DEFECTO,
    versionMotor: VERSION_MOTOR,
  };

  // Sin nombre no hay nada que leer. Devolver "básica" acá sería inventar.
  if (!nombre) {
    return {
      ...base,
      codigoTasa: null,
      estado: "REVIEW_REQUIRED",
      confianza: "BAJA",
      reglas: [],
      razon: "El producto no tiene nombre: no hay información para clasificar.",
      fuente: null,
    };
  }

  const coincidencias = REGLAS
    .map((r) => evaluar(r, nombre, categoria))
    .filter((c): c is Coincidencia => c !== null);

  // ── Contradicción: dos tasas distintas para el mismo producto ───────────
  const tasas = new Set<CodigoTasa>(coincidencias.map((c) => c.regla.codigoTasa));
  if (tasas.size > 1) {
    return {
      ...base,
      codigoTasa: null,
      estado: "REVIEW_REQUIRED",
      confianza: "BAJA",
      reglas: coincidencias.map((c) => c.regla.id),
      razon:
        `El producto coincide con reglas de tasas distintas ` +
        `(${[...tasas].join(", ")}). Hace falta que lo decida una persona.`,
      fuente: null,
    };
  }

  // ── Sin coincidencias: el default, y dicho como default ────────────────
  if (coincidencias.length === 0) {
    return {
      ...base,
      codigoTasa: "basica",
      estado: "SUGGESTED",
      confianza: "MEDIA",
      reglas: ["STANDARD_RATE"],
      razon:
        "No coincide con ninguna regla de tasa reducida ni de exoneración, " +
        "así que le corresponde la tasa general.",
      fuente: fuenteDe("IVA_TASA_BASICA"),
    };
  }

  // ── Una sola tasa: gana, con la confianza que corresponda ───────────────
  const mejor = coincidencias.reduce((a, b) => (b.senales > a.senales ? b : a));
  const confianza: Confianza = mejor.senales >= 2 ? "ALTA" : "MEDIA";

  return {
    ...base,
    codigoTasa: mejor.regla.codigoTasa,
    estado: "SUGGESTED",
    confianza,
    reglas: coincidencias.map((c) => c.regla.id),
    razon:
      mejor.senales >= 2
        ? mejor.regla.razon
        : `${mejor.regla.razon}. Coincide sólo por ${mejor.regla.nombre && alguna(mejor.regla.nombre, nombre) ? "el nombre" : "la categoría"}: conviene confirmarlo.`,
    fuente: fuenteDe(mejor.regla.fuente),
  };
}
