/**
 * De toda vista se tiene que poder volver.
 *
 * POR QUÉ ESTE TEST EXISTE
 * Porque el síntoma de que falte no es un error: es una pantalla que funciona
 * perfecto y de la que no se sale. Se abre un formulario, se despliega una
 * fila, se entra a Importar, y la única salida es el menú lateral —que no
 * vuelve al paso anterior sino que se va a otra cosa, y con algo a medio
 * escribir eso lo pierde—.
 *
 * Y tiene que estar en el PRIMER dibujo, como los demás botones de la barra: un
 * "Volver" que aparece después de tocar algo no es una salida, es una sorpresa.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Pantalla, usePantalla } from "../src/app/admin/components/Pantalla";

function pantallaCon(props: Record<string, unknown>) {
  return function Pantallita() {
    const p = usePantalla();
    return <Pantalla p={p} {...props}><div>contenido</div></Pantalla>;
  };
}

const dibujar = (props: Record<string, unknown>) =>
  renderToStaticMarkup(React.createElement(pantallaCon(props)));

describe("volver", () => {
  it("está en el primer dibujo, y dice a dónde vuelve", () => {
    const html = dibujar({ volver: { a: "la lista", onVolver: () => {} } });
    expect(html).toContain("← Volver a la lista");
  });

  it("sin nada de dónde volver, no se dibuja", () => {
    // Un "Volver" permanente en una pantalla que ya está en su estado inicial
    // no dice a dónde iría.
    expect(dibujar({})).not.toContain("Volver");
  });

  it("va ANTES que las secciones: la salida se busca siempre en el mismo lugar", () => {
    const html = dibujar({
      volver: { a: "la lista", onVolver: () => {} },
      secciones: {
        valor: "todo", onCambio: () => {},
        opciones: [{ valor: "todo", label: "Todo" },
                   { valor: "articulos", label: "Artículos" }],
      },
    });
    expect(html.indexOf("Volver a la lista")).toBeLessThan(html.indexOf("Artículos"));
  });

  it("convive con las acciones de la sección activa sin pisarlas", () => {
    const html = dibujar({
      volver: { a: "la lista", onVolver: () => {} },
      secciones: {
        valor: "articulos", onCambio: () => {},
        opciones: [
          { valor: "todo", label: "Todo" },
          { valor: "articulos", label: "Artículos",
            acciones: [{ label: "Market +", onClick: () => {} }] },
        ],
      },
    });
    expect(html).toContain("← Volver a la lista");
    expect(html).toContain("Market +");
  });

  it("las acciones de una sección que NO está activa no se dibujan", () => {
    const html = dibujar({
      secciones: {
        valor: "todo", onCambio: () => {},
        opciones: [
          { valor: "todo", label: "Todo" },
          { valor: "articulos", label: "Artículos",
            acciones: [{ label: "Market +", onClick: () => {} }] },
        ],
      },
    });
    expect(html).not.toContain("Market +");
  });
});
