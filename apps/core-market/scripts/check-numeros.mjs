/**
 * Los números van a la derecha. Esto lo hace cumplir.
 *
 * POR QUÉ EXISTE
 * La regla estaba escrita en cada campo, uno por uno, y por eso siete de nueve
 * inputs numéricos no la cumplían. Una convención que hay que recordar cada vez
 * no es una regla: es una intención, y se pierde en el primer archivo nuevo.
 *
 * Este script corre en `agent:verify` y falla si aparece un `type="number"`
 * que no use `NUMERICO` de `src/app/admin/ui/numeros.ts`.
 *
 * QUÉ NO CUBRE — a propósito, y hay que saberlo
 * Sólo mira inputs. Un número mostrado en un `<td>` o un `<div>` no se puede
 * distinguir de un texto sin entender el código, así que esos siguen siendo
 * responsabilidad de quien los escribe. Cubre la regresión más común, no todas.
 *
 * Una excepción se marca con `// numeros-ok:` y el motivo en la línea de
 * arriba. Que haya que escribir el motivo es el punto: una excepción sin razón
 * es la regla rota.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RAIZ = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const FUENTES = join(RAIZ, "src");
const TOKEN = /\bNUMERICO(_SELECT)?\b/;
const EXCEPCION = /\/\/\s*numeros-ok:/;

/** Todos los .tsx bajo src/, sin node_modules ni lib de terceros. */
function archivos(dir, salida = []) {
  for (const nombre of readdirSync(dir)) {
    if (nombre === "node_modules" || nombre.startsWith(".")) continue;
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) archivos(ruta, salida);
    else if (nombre.endsWith(".tsx")) salida.push(ruta);
  }
  return salida;
}

/**
 * El elemento JSX que contiene la posición `desde`, desde su `<` hasta el `>`
 * que lo cierra.
 *
 * No alcanza con contar `<` y `>`: un handler trae `=>` en cada arrow function
 * y una comparación trae `>=`, y con eso el elemento se cortaba antes del
 * `style` —que casi siempre va en otro renglón— y el chequeo marcaba como
 * faltantes campos que sí cumplían.
 *
 * Se recorre carácter por carácter salteando comillas y contando llaves: el
 * `>` sólo cierra cuando estamos en profundidad cero de `{}` y no es parte de
 * `=>` ni de `>=`.
 */
function elemento(texto, desde) {
  const abre = texto.lastIndexOf("<", desde);
  let llaves = 0, comilla = null;

  for (let i = abre + 1; i < texto.length; i++) {
    const c = texto[i];

    if (comilla) {
      if (c === "\\") { i++; continue; }
      if (c === comilla) comilla = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { comilla = c; continue; }
    if (c === "{") { llaves++; continue; }
    if (c === "}") { llaves--; continue; }

    if (c === ">" && llaves === 0 && texto[i - 1] !== "=") {
      return texto.slice(abre, i + 1);
    }
  }
  return texto.slice(abre);
}

/**
 * ¿El elemento aplica la regla, aunque sea a través de una variable?
 *
 * `style={icNum}` cumple si `icNum` se declaró con NUMERICO. Exigir el token
 * literal adentro del elemento castigaba justo al código que hizo lo correcto:
 * definir el estilo una vez y reutilizarlo.
 */
function cumple(el, texto) {
  if (TOKEN.test(el)) return true;

  const style = /style=\{([\s\S]*?)\}\s*(?:\/?>|\n|[a-zA-Z-]+=)/.exec(el);
  const expr = style ? style[1] : el;

  for (const ident of expr.match(/[A-Za-z_$][\w$]*/g) ?? []) {
    const decl = new RegExp(
      `(?:const|let|var)\\s+${ident}\\s*(?::[^=]*)?=\\s*([\\s\\S]{0,300}?);`, "m"
    ).exec(texto);
    if (decl && TOKEN.test(decl[1])) return true;
  }
  return false;
}

const revisados = archivos(FUENTES);
const faltan = [];

for (const ruta of revisados) {
  const texto = readFileSync(ruta, "utf8");
  const lineas = texto.split("\n");
  const re = /type="number"/g;
  let m;
  while ((m = re.exec(texto)) !== null) {
    if (cumple(elemento(texto, m.index), texto)) continue;

    const linea = texto.slice(0, m.index).split("\n").length;
    if (EXCEPCION.test(lineas[linea - 2] ?? "") || EXCEPCION.test(lineas[linea - 1] ?? "")) continue;

    faltan.push(`${relative(RAIZ, ruta).replace(/\\/g, "/")}:${linea}`);
  }
}

if (faltan.length) {
  console.error(
    "\nLos valores numéricos van alineados a la derecha.\n" +
    'Estos <input type="number"> no usan NUMERICO de src/app/admin/ui/numeros.ts:\n'
  );
  for (const f of faltan) console.error("  " + f);
  console.error(
    "\nArreglo:  style={{ ...inp, ...NUMERICO }}\n" +
    "Excepción justificada: poné `// numeros-ok: <motivo>` en la línea de arriba.\n"
  );
  process.exit(1);
}

console.log(`números alineados — ${revisados.length} archivos revisados, sin faltantes`);
