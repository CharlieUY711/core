/**
 * Las reglas del proyecto, corridas todas juntas.
 *
 * POR QUÉ HAY UN RUNNER Y NO UN SCRIPT SUELTO EN package.json
 * `agent:verify` busca un script llamado `lint` y corre ése. Si cada regla
 * nueva tuviera que agregarse a mano al comando, la primera que alguien
 * olvidara quedaría escrita y sin correr — que es exactamente cómo la regla de
 * alineación llegó a estar en siete de nueve campos sin cumplirse.
 *
 * Acá se levantan solas: todo `scripts/check-*.mjs` corre. Agregar una regla es
 * agregar un archivo.
 *
 * Corren todas aunque una falle. Ver los tres problemas de una vez y arreglarlos
 * juntos es mejor que descubrirlos de a uno, cada uno tras una corrida entera.
 */
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));

const reglas = readdirSync(AQUI)
  .filter((f) => f.startsWith("check-") && f.endsWith(".mjs"))
  .sort();

if (!reglas.length) {
  console.log("lint — no hay reglas todavía (scripts/check-*.mjs)");
  process.exit(0);
}

let fallaron = 0;
for (const regla of reglas) {
  const r = spawnSync(process.execPath, [join(AQUI, regla)], { stdio: "inherit" });
  if (r.status !== 0) fallaron++;
}

if (fallaron) {
  console.error(`\nlint — ${fallaron} de ${reglas.length} reglas fallaron.`);
  process.exit(1);
}
console.log(`lint — ${reglas.length} regla(s), todo en orden.`);
