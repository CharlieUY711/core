/**
 * Adivina departamento / categoría / subcategoría propios a partir de la
 * categoría que Mercado Libre sugiere para un artículo.
 *
 * ML tiene su propia taxonomía y no comparte ids con la nuestra, así que no
 * hay forma de "traducir" un category_id directo. Lo que sí viaja es el
 * camino de nombres de esa categoría (de la raíz a la hoja, por ejemplo
 * "Celulares y Teléfonos > Celulares y Smartphones"), y ahí suele haber
 * coincidencias de texto con nuestros propios nombres. Por eso el matching es
 * por nombre, de arriba hacia abajo, y sólo se acepta cuando se parece lo
 * suficiente: es una sugerencia para revisar, no una asignación automática
 * silenciosa.
 */

export interface NodoTaxonomia { id: string; nombre: string; }
export interface CategoriaConDepto extends NodoTaxonomia { departamento_id: string; }
export interface SubcategoriaConCat extends NodoTaxonomia { categoria_id: string; }

export interface PrediccionTaxonomia {
  departamento: NodoTaxonomia | null;
  categoria:    NodoTaxonomia | null;
  subcategoria: NodoTaxonomia | null;
}

const normalizar = (s: string): string =>
  s.toLowerCase()
   .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // saca tildes
   .replace(/[^a-z0-9\s]/g, " ")
   .replace(/\s+/g, " ")
   .trim();

const tokens = (s: string): Set<string> => new Set(normalizar(s).split(" ").filter(Boolean));

/** Qué tan parecidos son dos nombres, de 0 (nada) a 1 (igual). */
function parecido(a: string, b: string): number {
  const na = normalizar(a), nb = normalizar(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const ta = tokens(a), tb = tokens(b);
  const interseccion = [...ta].filter(t => tb.has(t)).length;
  const union = new Set([...ta, ...tb]).size;
  return union ? interseccion / union : 0;
}

/** Mejor nombre del camino de ML contra una lista de nodos propios. */
function mejorMatch<T extends NodoTaxonomia>(
  path: string[], candidatos: T[], umbral: number,
): T | null {
  let mejor: T | null = null;
  let mejorScore = umbral;
  for (const nombreMl of path) {
    for (const c of candidatos) {
      const score = parecido(nombreMl, c.nombre);
      if (score > mejorScore) { mejorScore = score; mejor = c; }
    }
  }
  return mejor;
}

/**
 * Intenta ubicar el camino de categoría de ML dentro de nuestra propia
 * taxonomía. Cada nivel se busca sólo dentro del nivel anterior ya
 * encontrado (la categoría dentro del departamento adivinado, la
 * subcategoría dentro de esa categoría): así no se cruzan ramas que
 * coinciden de nombre por casualidad pero no tienen nada que ver.
 *
 * Umbral relativamente permisivo (0.3): esto es una sugerencia que la
 * persona revisa y puede cambiar, no una carga automática — preferible
 * ofrecer un candidato razonable y que lo corrijan a no sugerir nada.
 */
export function predecirTaxonomia(
  pathMl: string[],
  deptos: NodoTaxonomia[],
  cats: CategoriaConDepto[],
  subcats: SubcategoriaConCat[],
  umbral = 0.3,
): PrediccionTaxonomia {
  if (!pathMl.length) return { departamento: null, categoria: null, subcategoria: null };

  const departamento = mejorMatch(pathMl, deptos, umbral);

  const catsDelDepto = departamento
    ? cats.filter(c => c.departamento_id === departamento.id)
    : cats;
  const categoria = mejorMatch(pathMl, catsDelDepto, umbral);

  const subsDeLaCat = categoria
    ? subcats.filter(s => s.categoria_id === categoria.id)
    : [];
  const subcategoria = mejorMatch(pathMl, subsDeLaCat, umbral);

  return { departamento, categoria, subcategoria };
}
