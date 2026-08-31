/**
 * La fila que la PANTALLA abre está desplegada en el primer dibujo.
 *
 * POR QUÉ ESTE TEST EXISTE
 * El alta de un artículo aparece con su formulario ya abierto: la fila se
 * agrega a la lista y el detalle sale debajo, sin pedir un clic más. Eso lo
 * decide la pantalla —`abierta`—, no la tabla.
 *
 * Es un fallo silencioso de manual: la fila se dibuja, la tabla se dibuja, y el
 * formulario simplemente no está. Nada falla, no hay error, y de lejos parece
 * que hay que apretar la flecha.
 *
 * `renderToStaticMarkup` dibuja UNA vez y no corre efectos: es exactamente el
 * primer dibujo.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Pantalla, usePantalla } from "../src/app/admin/components/Pantalla";
import { Tabla } from "../src/app/admin/components/Tabla";

function pantallaCon(cfg: Record<string, unknown>) {
  return function Pantallita() {
    const p = usePantalla();
    const n = p.tablas.nivel("x", {
      columnas: [{ id: "a", label: "A" }],
      filas: [{ clave: "nueva", a: "sin título todavía" }, { clave: "1", a: "uno" }],
      detalle: (f: { clave: string }) =>
        React.createElement("div", null, `detalle de ${f.clave}`),
      ...cfg,
    } as never);
    return <Pantalla p={p}><Tabla {...n} /></Pantalla>;
  };
}

const dibujar = (cfg: Record<string, unknown>) =>
  renderToStaticMarkup(React.createElement(pantallaCon(cfg)));

describe("la fila desplegada", () => {
  it("muestra el detalle de la fila que abre la pantalla, sin ningún clic", () => {
    const html = dibujar({ abierta: "nueva", onAbierta: () => {} });
    expect(html).toContain("detalle de nueva");
  });

  it("no muestra el detalle de las demás", () => {
    const html = dibujar({ abierta: "nueva", onAbierta: () => {} });
    expect(html).not.toContain("detalle de 1");
  });

  it("sin `abierta`, la tabla arranca con todas cerradas", () => {
    const html = dibujar({});
    expect(html).not.toContain("detalle de nueva");
    expect(html).not.toContain("detalle de 1");
  });

  it("`abierta` en null no abre ninguna: es cerrar, no 'no opinar'", () => {
    const html = dibujar({ abierta: null, onAbierta: () => {} });
    expect(html).not.toContain("detalle de nueva");
  });

  it("sin `detalle` no hay nada que abrir, aunque la pantalla lo pida", () => {
    const html = dibujar({ abierta: "nueva", onAbierta: () => {}, detalle: undefined });
    expect(html).not.toContain("detalle de");
  });
});
