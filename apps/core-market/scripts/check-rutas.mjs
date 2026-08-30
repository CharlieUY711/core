/**
 * Una funcionalidad promete un lugar. El lugar tiene que existir.
 *
 * LA REGLA
 * Cada ruta declarada en `RUTAS` (admin/ui/catalogoDeApps.ts) tiene que
 * corresponder a una ruta real del router (app/routes.tsx).
 *
 * POR QUÉ ES UN CONTROL
 * Porque `analytics` estuvo meses en el catálogo, activa, con ruta
 * `/admin/analytics` declarada y sin ninguna pantalla detrás. Apretar "Abrir"
 * llevaba a una pantalla en blanco. Nada fallaba: el catálogo decía que el
 * lugar existía y el router no opinaba.
 *
 * Es el mismo tipo de error que el estado que mentía: no rompe, promete algo
 * que no está. Y esos son los que nadie encuentra mirando.
 */
import { readFileSync } from "node:fs";

const CATALOGO = "src/app/admin/ui/catalogoDeApps.ts";
const ROUTER   = "src/app/routes.tsx";

const catalogo = readFileSync(CATALOGO, "utf8");
const router   = readFileSync(ROUTER, "utf8");

/* Las rutas declaradas: el bloque `export const RUTAS`, hasta su llave. */
const bloque = catalogo.match(/export const RUTAS[^=]*=\s*\{([\s\S]*?)\n\};/);
if (!bloque) {
  console.error(`\n  No pude leer RUTAS en ${CATALOGO}.\n`);
  process.exit(1);
}

const declaradas = [...bloque[1].matchAll(/^\s*(\w+):\s*"([^"]+)"/gm)]
  .map(([, codigo, ruta]) => ({ codigo, ruta }));

if (declaradas.length === 0) {
  console.error(`\n  RUTAS quedó vacío en ${CATALOGO}: algo se rompió al leerlo.\n`);
  process.exit(1);
}

/* Las rutas reales de /admin. En el router son relativas ("biblioteca"), así
   que se les antepone el prefijo con el que se navega. */
const reales = new Set(
  [...router.matchAll(/path:\s*"([^"]*)"/g)]
    .map(([, p]) => p)
    .filter(p => p && !p.startsWith("/"))
    .map(p => `/admin/${p}`),
);

const rotas = declaradas.filter(d => !reales.has(d.ruta));

if (rotas.length) {
  console.error("\n  Estas funcionalidades prometen un lugar que no existe:\n");
  for (const r of rotas) console.error(`    ${r.codigo} → ${r.ruta}`);
  console.error(`
  Cada ruta de RUTAS (${CATALOGO}) tiene que existir en el router
  (${ROUTER}). Si la pantalla todavía no está, la fila del catálogo va
  apagada y sin ruta: prometer un lugar que no existe lleva a una pantalla en
  blanco, y el usuario no tiene forma de saber que el problema no es suyo.
`);
  process.exit(1);
}

console.log(`  rutas — ok (${declaradas.length} funcionalidades, todas con pantalla)`);
