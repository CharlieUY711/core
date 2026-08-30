/**
 * Toda lista del panel usa la misma tabla.
 *
 * LA REGLA
 * Nadie dibuja un `<table>` a mano en `src/app/admin`. Se usa `Tabla`
 * (components/Tabla.tsx), que trae el check por fila, los botones en la barra,
 * las acciones masivas por nivel, el orden y el ancho de las columnas, y el
 * rastro —creado, modificado— a la derecha.
 *
 * POR QUÉ ESTO ES UN CONTROL Y NO UNA RECOMENDACIÓN
 * Porque una convención que sólo está escrita se cumple hasta que alguien tiene
 * apuro. Y el costo no lo paga quien la rompe: lo paga el que usa el panel y
 * tiene que volver a aprender dónde está cada botón en cada pantalla.
 *
 * LA LISTA DE PENDIENTES ES EL PUNTO
 * `PENDIENTES` son las pantallas que todavía no se convirtieron. Está acá, a la
 * vista y numerada, en vez de escondida en la cabeza de alguien. Sólo se puede
 * ACHICAR: si aparece un archivo nuevo con una tabla a mano, esto falla.
 *
 * Al convertir una pantalla se saca su línea de acá. Cuando la lista quede
 * vacía, se borra la lista y queda la regla sola.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const RAIZ = "src/app/admin";

/** Los que SÍ pueden dibujar una tabla: son la tabla, o la envuelven. */
const PERMITIDOS = new Set([
  "components/Tabla.tsx",
]);

/**
 * Pantallas todavía sin convertir. Sólo se achica.
 *
 * Cada una es una pantalla donde los botones están en otro lado y el usuario
 * tiene que volver a buscarlos. No es deuda abstracta: es eso.
 */
const PENDIENTES = new Set([
  "components/Definiciones.tsx",         // el detalle de un territorio
  "components/ficha/DatosDelProducto.tsx",
  "pages/AdminExport.tsx",
  "pages/AdminImport.tsx",
  "pages/AdminML.tsx",
  "pages/AdminMisPublicaciones.tsx",
  "pages/AdminProducts.tsx",
  "pages/AdminPublicaciones.tsx",
]);

function* archivos(dir) {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) yield* archivos(ruta);
    else if (nombre.endsWith(".tsx")) yield ruta;
  }
}

const nuevos = [];
const yaConvertidos = [];

for (const ruta of archivos(RAIZ)) {
  const rel = relative(RAIZ, ruta).split(sep).join("/");
  if (PERMITIDOS.has(rel)) continue;

  const tieneTabla = /<table[\s>]/.test(readFileSync(ruta, "utf8"));

  if (tieneTabla && !PENDIENTES.has(rel)) nuevos.push(rel);
  if (!tieneTabla && PENDIENTES.has(rel)) yaConvertidos.push(rel);
}

if (nuevos.length) {
  console.error("\n  Hay tablas dibujadas a mano fuera de la lista de pendientes:\n");
  for (const r of nuevos) console.error(`    ${RAIZ}/${r}`);
  console.error(`
  Toda lista del panel usa <Tabla> (admin/components/Tabla.tsx): check por
  fila, botones en la barra, acciones masivas por nivel, columnas en el mismo
  orden y con el mismo ancho, y el rastro a la derecha.

  Si el usuario tiene que buscar los botones en cada pantalla, perdimos.
`);
  process.exit(1);
}

if (yaConvertidos.length) {
  console.error("\n  Estas ya no dibujan tablas a mano: sacalas de PENDIENTES\n");
  for (const r of yaConvertidos) console.error(`    ${r}`);
  console.error("\n  La lista sólo sirve si refleja lo que falta de verdad.\n");
  process.exit(1);
}

console.log(`  tablas — ok (${PENDIENTES.size} pantallas pendientes de convertir)`);
