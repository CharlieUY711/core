/**
 * Cómo se presenta una lista: en lista o en íconos, y de qué tamaño.
 *
 * DE DÓNDE SALE EL TAMAÑO "GRANDE"
 * De la tarjeta real del artículo, no de un número elegido a ojo. La tarjeta
 * del Market mide `ANCHO_TARJETA` de ancho —se deduce en `AdminArticulos` a
 * partir de su geometría— y "Grandes" es exactamente eso: en la Biblioteca el
 * artículo se ve como se va a ver en la tienda.
 *
 * Si el número se inventaba, la promesa "se parece a su tarjeta" duraba hasta
 * el primer cambio de diseño de la tarjeta.
 *
 * MEDIANOS Y CHICOS
 * Mitad y cuarta parte de la diagonal. Como la tarjeta es una figura, dividir
 * la diagonal a la mitad es dividir cada lado a la mitad: el área queda en un
 * cuarto y en un dieciseisavo. Por eso alcanza con escalar el ancho.
 *
 * SE AJUSTA AL ANCHO VISIBLE
 * Estas medidas son un MÍNIMO, no un ancho fijo: la grilla se arma con
 * `repeat(auto-fill, minmax(<medida>, 1fr))`, así que entran las que entren y
 * se reparten el sobrante. Con ancho fijo quedaba un hueco a la derecha que
 * crecía con la pantalla.
 */

/**
 * Ancho de la tarjeta del artículo en la tienda.
 *
 * Sale de `GEOMETRIA` en AdminArticulos: el alto fijo de la tarjeta (285) fija
 * el lado del tile, seis filas de tiles fijan el alto de la columna, y el ancho
 * de la tarjeta es lo que sobra. Da 281.
 */
export const ANCHO_TARJETA = 281;

export type Vista = "lista" | "grandes" | "medianos" | "chicos";

export interface DefinicionDeVista {
  id: Vista;
  label: string;
  /** Ancho mínimo del ícono. `null` en lista, que no usa grilla. */
  ancho: number | null;
  /** Qué se muestra debajo de la miniatura. */
  detalle: "completo" | "nombre" | "ninguno";
}

export const VISTAS: DefinicionDeVista[] = [
  { id: "lista",    label: "Lista",    ancho: null,                          detalle: "completo" },
  { id: "grandes",  label: "Grandes",  ancho: ANCHO_TARJETA,                 detalle: "completo" },
  { id: "medianos", label: "Medianos", ancho: Math.round(ANCHO_TARJETA / 2), detalle: "nombre"   },
  // En chicos el nombre no se muestra: a 70px entraría media palabra en una
  // tipografía ilegible. Va en el `title`, que es donde se lee sin estorbar.
  { id: "chicos",   label: "Chicos",   ancho: Math.round(ANCHO_TARJETA / 4), detalle: "ninguno"  },
];

export const definicionDeVista = (v: Vista): DefinicionDeVista =>
  VISTAS.find(d => d.id === v) ?? VISTAS[1];
