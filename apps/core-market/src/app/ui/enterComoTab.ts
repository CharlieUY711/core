/**
 * Enter se comporta como Tab: cierra el campo y pasa al siguiente.
 *
 * LA REGLA, PARA TODO EL SISTEMA
 * En un formulario, Tab ya avanza —lo hace el navegador— pero Enter no hace
 * nada, o peor: envía el formulario. Quien carga datos escribe y aprieta Enter,
 * porque es lo que hacen todas las planillas del mundo. Que no pase nada se
 * siente como que el campo no tomó el valor.
 *
 * POR QUÉ ESTÁ ACÁ Y NO EN CADA CAMPO
 * Un `onKeyDown` por input es una convención: alcanza con que alguien agregue
 * un campo sin acordarse para que la regla deje de valer en ese lugar, y nadie
 * lo note hasta que un usuario se traba. Acá se instala una vez, en el
 * documento, y vale para todo lo que exista y para todo lo que se agregue.
 *
 * QUÉ NO TOCA, Y POR QUÉ
 * - `textarea`: ahí Enter es un salto de línea. Robárselo haría imposible
 *   escribir una descripción en párrafos.
 * - Botones y enlaces: Enter los activa, que es lo que corresponde.
 * - Campos dentro de un elemento marcado `data-enter-nativo`: la salida para
 *   los casos donde Enter tiene que significar otra cosa (un buscador que
 *   dispara la búsqueda, un diálogo que confirma).
 * - Enter con Shift, Ctrl, Alt o Meta: son atajos, no "siguiente campo".
 */

/** Lo que puede recibir foco, en el orden en que Tab los recorre. */
const ENFOCABLES = [
  "input:not([type=hidden]):not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "a[href]",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function siguiente(desde: HTMLElement): HTMLElement | null {
  const todos = Array.from(document.querySelectorAll<HTMLElement>(ENFOCABLES))
    // `offsetParent` nulo es un elemento oculto: Tab tampoco se detiene ahí.
    .filter((el) => el.offsetParent !== null || el === desde);

  const i = todos.indexOf(desde);
  if (i === -1) return null;

  for (let j = i + 1; j < todos.length; j++) {
    if (todos[j].tabIndex !== -1) return todos[j];
  }
  return null;
}

/**
 * Instala la regla. Se llama una sola vez, al arrancar la aplicación.
 * Devuelve la función para desinstalarla, que sirve en tests.
 */
export function instalarEnterComoTab(): () => void {
  const alPresionar = (e: KeyboardEvent) => {
    if (e.key !== "Enter") return;
    if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;

    const el = e.target as HTMLElement | null;
    if (!el) return;

    const tag = el.tagName?.toLowerCase();
    if (tag !== "input" && tag !== "select") return;
    if ((el as HTMLInputElement).type === "submit") return;
    if (el.closest("[data-enter-nativo]")) return;

    // Sin preventDefault, un input suelto adentro de un <form> lo envía.
    e.preventDefault();

    const proximo = siguiente(el);
    if (!proximo) {
      // Último campo: se suelta el foco igual. Que el cursor se quede
      // parpadeando ahí después de un Enter parece que no tomó el valor.
      el.blur();
      return;
    }
    proximo.focus();
    if (proximo instanceof HTMLInputElement && proximo.type !== "checkbox") {
      proximo.select();
    }
  };

  document.addEventListener("keydown", alPresionar);
  return () => document.removeEventListener("keydown", alPresionar);
}
