/**
 * Toda pantalla del panel usa la misma pantalla.
 *
 * LA REGLA
 * Cada vista de `/admin` se dibuja con `Pantalla` (components/Pantalla.tsx),
 * que trae la barra —el menú a la izquierda, las cuatro acciones a la derecha—,
 * el buscador debajo con el selector de sección adentro, el aviso, el error y
 * el ancho.
 *
 * LA ÚNICA EXCEPCIÓN ES EL DASHBOARD
 * No es una pantalla de trabajo, es un monitor: indicadores y nada que operar.
 * Una barra de acciones ahí serían botones sin nada sobre qué actuar.
 *
 * POR QUÉ ESTO ES UN CONTROL Y NO UNA RECOMENDACIÓN
 * Porque el que usa el panel no debería estudiar cada página. Si cada vista
 * decide dónde va su buscador y dónde sus botones, moverse de una a otra es un
 * destello tras otro: buscar, volver a mirar, recién ahí hacer.
 *
 * LA LISTA DE PENDIENTES ES EL PUNTO
 * Está acá, a la vista y numerada, en vez de escondida en la cabeza de alguien.
 * Sólo se puede ACHICAR: si aparece una vista nueva sin `Pantalla`, esto falla.
 * Cuando quede vacía, se borra la lista y queda la regla sola.
 */
import { readFileSync } from "node:fs";

const RUTAS = "src/app/routes.tsx";

/** Un monitor, no una pantalla de trabajo. La única que no lleva barra. */
const MONITOR = new Set(["admin-dashboard"]);

/**
 * Vistas todavía sin convertir. Sólo se achica.
 *
 * Cada una es una pantalla donde el buscador y los botones están en otro lado
 * y hay que volver a buscarlos. No es deuda abstracta: es eso.
 */
const PENDIENTES = new Set([
  "admin-publicaciones",
  "admin-export",
  "admin-import",
  "admin-catalog",
  "admin-ml",
  "admin-editor",
  "admin-publicacion-nueva",
]);

const rutas = readFileSync(RUTAS, "utf8");

/* Las vistas de /admin, con el archivo de cada una. Se leen del router y no de
   una lista aparte: una lista aparte se olvida, el router no. */
const componentes = Object.fromEntries(
  [...rutas.matchAll(/^import (\w+) from "(\.[^"]+)"/gm)].map(m => [m[1], m[2]]));

const vistas = [...rutas.matchAll(/\{ id: "(admin-[\w-]+)",\s*path: "[^"]*",\s*Component: (\w+) \}/g)]
  .map(([, id, comp]) => ({ id, comp, ruta: componentes[comp] }));

if (vistas.length === 0) {
  console.error("\n  No pude leer las vistas de /admin en " + RUTAS + ".");
  process.exit(1);
}

const sinPantalla = [];
const yaConvertidas = [];

for (const v of vistas) {
  if (MONITOR.has(v.id)) continue;
  if (!v.ruta) continue;

  const archivo = "src/app/" + v.ruta.replace(/^\.\//, "") + ".tsx";
  let fuente;
  try { fuente = readFileSync(archivo, "utf8"); } catch { continue; }

  /* Vale que la use la vista o que la use lo que la vista dibuja: hay páginas
     que son una línea y delegan en un componente -AdminDefiniciones-. */
  const usa = /components\/Pantalla/.test(fuente)
    || /from "\.\.\/components\/(\w+)"/.test(fuente) && dibujaPantalla(fuente);

  if (!usa && !PENDIENTES.has(v.id)) sinPantalla.push(`${v.id} → ${archivo}`);
  if (usa && PENDIENTES.has(v.id))  yaConvertidas.push(v.id);
}

/** Sigue un salto: la página delega en un componente que sí usa `Pantalla`. */
function dibujaPantalla(fuente) {
  for (const m of fuente.matchAll(/from "(\.\.?\/[\w/]+)"/g)) {
    const destino = "src/app/admin/" + m[1].replace(/^\.\.\//, "").replace(/^\.\//, "") + ".tsx";
    try {
      if (/components\/Pantalla/.test(readFileSync(destino, "utf8"))) return true;
    } catch { /* no es un archivo nuestro */ }
  }
  return false;
}

if (sinPantalla.length) {
  console.error("\n  Estas vistas de /admin no usan `Pantalla`:\n");
  for (const r of sinPantalla) console.error(`    ${r}`);
  console.error(`
  Toda vista del panel usa <Pantalla> (admin/components/Pantalla.tsx): la barra
  con el menú y las cuatro acciones, el buscador debajo con el selector de
  sección adentro, el aviso, el error y el ancho.

  La única excepción es el Dashboard: es un monitor, no una pantalla de trabajo.
`);
  process.exit(1);
}

if (yaConvertidas.length) {
  console.error("\n  Estas ya usan `Pantalla`: sacalas de PENDIENTES\n");
  for (const r of yaConvertidas) console.error(`    ${r}`);
  console.error("\n  La lista sólo sirve si refleja lo que falta de verdad.\n");
  process.exit(1);
}

console.log(`  pantallas — ok (${PENDIENTES.size} vistas pendientes de convertir)`);
