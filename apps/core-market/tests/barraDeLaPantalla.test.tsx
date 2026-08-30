/**
 * Los botones de la barra están en el PRIMER dibujo.
 *
 * POR QUÉ ESTE TEST EXISTE
 * Porque esto se rompió tres veces y las tres se "arregló" mirando la pantalla
 * y creyendo que sí. El síntoma es discreto: la barra se dibuja, la tabla se
 * dibuja, y el lado derecho queda vacío hasta que elegís una fila. Nada falla.
 *
 * `renderToStaticMarkup` dibuja UNA vez y no corre efectos. Es exactamente el
 * primer dibujo: si el botón no está acá, el usuario no lo ve al entrar.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Pantalla, usePantalla } from "../src/app/admin/components/Pantalla";
import { Tabla } from "../src/app/admin/components/Tabla";

/** Una pantalla como las de verdad: declara su nivel ANTES del `return`. */
function pantallaCon(cfg: Record<string, unknown>) {
  return function Pantallita() {
    const p = usePantalla();
    const n = p.tablas.nivel("x", {
      columnas: [{ id: "a", label: "A", editable: true }],
      filas: [{ clave: "1", a: "uno" }],
      ...cfg,
    } as never);
    return <Pantalla p={p}><Tabla {...n} /></Pantalla>;
  };
}

const dibujar = (cfg: Record<string, unknown>) =>
  renderToStaticMarkup(React.createElement(pantallaCon(cfg)));

const TODO = {
  onCrear:   async () => {},
  onGuardar: async () => {},
  onBorrar:  async () => {},
};

describe("la tabla", () => {
  it("no tumba la pantalla por un tono que no existe", () => {
    // Pasó: una herramienta pidió el tono "aviso" -que no está en la lista- y
    // toda la vista murió con "Cannot read properties of undefined (texto)".
    // Un chip mal pintado se ve mal; una pantalla en blanco no se puede usar.
    function ConChip() {
      const p = usePantalla();
      const n = p.tablas.nivel("x", {
        columnas: [{ id: "e", label: "Estado",
          chip: () => ({ tono: "inventado" as never, texto: "RARO" }) }],
        filas: [{ clave: "1" }],
      });
      return <Pantalla p={p}><Tabla {...n} /></Pantalla>;
    }
    const html = renderToStaticMarkup(<ConChip />);
    expect(html).toContain("RARO");
  });

  it("deja que un chip sea null sin romper", () => {
    function SinChip() {
      const p = usePantalla();
      const n = p.tablas.nivel("x", {
        columnas: [{ id: "e", label: "Estado", chip: () => null }],
        filas: [{ clave: "1" }],
      });
      return <Pantalla p={p}><Tabla {...n} /></Pantalla>;
    }
    expect(() => renderToStaticMarkup(<SinChip />)).not.toThrow();
  });
});

describe("la campanita", () => {
  function conAvisos(notificaciones: { texto: string; tono?: any }[]) {
    function P() {
      const p = usePantalla();
      return <Pantalla p={p} notificaciones={notificaciones}><div /></Pantalla>;
    }
    return renderToStaticMarkup(<P />);
  }

  it("está aunque no haya nada, apagada y diciendo por qué", () => {
    // Si apareciera sólo cuando hay algo, los botones de al lado se correrían
    // de lugar cada vez, y habría que estar mirando para saber que existe.
    const html = conAvisos([]);
    expect(html).toContain("No hay nada para mirar");
    expect(html).toContain("<svg");
  });

  it("no pinta el punto rojo si no hay nada", () => {
    expect(conAvisos([])).not.toContain("#EF4444");
  });

  it("pinta el punto rojo y cuenta cuando hay", () => {
    const html = conAvisos([
      { texto: "uno", tono: "atencion" },
      { texto: "dos", tono: "error" },
    ]);
    expect(html).toContain("#EF4444");
    expect(html).toContain("2 avisos");
    // El texto vive adentro del desplegable: a esta altura importa que HAY algo.
    expect(html).not.toContain("uno");
  });
});

describe("el buscador", () => {
  it("dibuja la lupa y el selector de la sección, no dos listas", () => {
    function ConBuscador() {
      const p = usePantalla();
      return <Pantalla p={p}
        secciones={{ valor: "b", onCambio: () => {},
          opciones: [{ valor: "a", label: "Todo" }, { valor: "b", label: "Multimedia" }] }}
        buscador={{ valor: "", onCambio: () => {} }}>
        <div />
      </Pantalla>;
    }
    const html = renderToStaticMarkup(<ConBuscador />);
    expect(html, "falta la lupa").toContain("<svg");
    expect(html, "falta el placeholder").toContain('placeholder="Buscar"');
    // La misma sección, dibujada dos veces: botón en el menú y opción en el
    // selector. Si alguna vez son dos listas, una de las dos se va a quedar.
    expect(html.match(/Multimedia/g)?.length, "la sección debe verse en los dos lugares").toBe(2);
    expect(html).toContain('<option value="b"');
  });
});

describe("la barra de la pantalla", () => {
  it("dibuja las cuatro acciones en el primer render, sin efectos", () => {
    const html = dibujar(TODO);
    for (const b of ["Agregar", "Editar", "Grabar", "Eliminar"]) {
      expect(html, `falta "${b}" en el primer dibujo`).toContain(b);
    }
  });

  it("dibuja SÓLO lo que la herramienta puede hacer", () => {
    // Una lista que no se agrega ni se edita: un "Agregar" apagado para
    // siempre es ruido que igual hay que leer para descartarlo.
    const html = dibujar({ onBorrar: async () => {} });
    expect(html).toContain("Eliminar");
    expect(html).not.toContain("Agregar");
    expect(html).not.toContain("Grabar");
  });

  it("los apaga en su lugar y dice por qué, en vez de esconderlos", () => {
    const html = dibujar(TODO);
    // Nada elegido y nada en edición: Editar, Grabar y Eliminar no se pueden.
    expect(html).toContain("disabled");
    expect(html).toContain("Elegí una fila");
    expect(html).toContain("No hay nada que grabar");
    // Agregar sí: no necesita que haya nada elegido.
    expect(html).toMatch(/<button(?![^>]*disabled)[^>]*>Agregar</);
  });
});
