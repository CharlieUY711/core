/**
 * Los tres roles de una persona dentro de un vendedor.
 *
 * UNA SOLA LISTA
 * La usan las dos vistas de la misma relación —los miembros de un vendedor y
 * los vendedores de una persona— y el día que haya un cuarto rol, aparece en
 * las dos sin que nadie se acuerde de la segunda.
 *
 * No confundir con las CAPACIDADES, que son lo que puede el vendedor. Acá se
 * trata de lo que puede la persona adentro de él.
 */
export const ROLES: { valor: string; label: string }[] = [
  { valor: "duenio",        label: "Dueño" },
  { valor: "administrador", label: "Administrador" },
  { valor: "operador",      label: "Operador" },
];

export const nombreDeRol = (r: string) =>
  ROLES.find(x => x.valor === r)?.label ?? r;

/** Qué puede cada uno, en una línea. Se muestra al pie de las dos vistas. */
export const QUE_PUEDE_CADA_ROL =
  "Dueño administra quién entra. Administrador configura y publica. " +
  "Operador carga artículos y atiende pedidos. Siempre tiene que quedar al menos un dueño.";
