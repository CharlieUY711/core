/**
 * Los siete casos que define la Fase 02.
 *
 * El que mas importa es el ultimo: cuando la sugerencia coincide con la
 * taxonomia NO se crea una excepcion. Es lo unico de esta integracion que
 * puede estar mal de forma silenciosa —crear una excepcion de mas no rompe
 * nada visible— y es justo lo que desarma la herencia.
 */
import { describe, it, expect } from "vitest";
import { decidir, hayDatosSuficientes, type EstadoFiscal } from "../src/app/admin/tax/decidir";
import type { Clasificacion } from "@core/tax";

const sugerencia = (over: Partial<Clasificacion> = {}): Clasificacion => ({
  pais: "UY",
  codigoTasa: "basica",
  estado: "SUGGESTED",
  confianza: "ALTA",
  reglas: ["STANDARD_ELECTRONICA"],
  razon: "Producto de electrónica",
  fuente: null,
  versionMotor: "0.1.0",
  ...over,
});

const estado = (over: Partial<EstadoFiscal> = {}): EstadoFiscal => ({
  heredada: "basica",
  excepcion: null,
  origen: null,
  ...over,
});

describe("1 · coincide con la taxonomia", () => {
  it("confirma la herencia", () => {
    const d = decidir(sugerencia({ codigoTasa: "basica" }), estado({ heredada: "basica" }));
    expect(d.accion).toBe("CONFIRMAR_HERENCIA");
    expect(d.origen).toBe("CONFIRMED");
  });
});

describe("2 · la sugerencia difiere de la taxonomia", () => {
  it("materializa la excepcion", () => {
    const d = decidir(sugerencia({ codigoTasa: "minima" }), estado({ heredada: "basica" }));
    expect(d.accion).toBe("CREAR_EXCEPCION");
    expect(d.tasaAGuardar).toBe("minima");
    expect(d.origen).toBe("SUGGESTED");
  });
});

describe("3 · REVIEW_REQUIRED", () => {
  it("no cambia la clasificacion, pide revision", () => {
    const d = decidir(
      sugerencia({ estado: "REVIEW_REQUIRED", codigoTasa: null, razon: "Señales contradictorias" }),
      estado({ heredada: "basica", excepcion: "minima" }),
    );
    expect(d.accion).toBe("PEDIR_REVISION");
    // La excepcion que habia queda como estaba: pedir revision no es cambiar.
    expect(d.tasaAGuardar).toBe("minima");
  });
});

describe("4 · una clasificacion manual no se sobrescribe", () => {
  it("respeta lo manual aunque el motor sugiera otra cosa", () => {
    const d = decidir(
      sugerencia({ codigoTasa: "minima" }),
      estado({ heredada: "basica", excepcion: "basica", origen: "MANUAL" }),
    );
    expect(d.accion).toBe("RESPETAR_MANUAL");
    expect(d.tasaAGuardar).toBe("basica");
  });

  it("salvo que el usuario lo pida explicitamente", () => {
    const d = decidir(
      sugerencia({ codigoTasa: "minima" }),
      estado({ heredada: "basica", excepcion: "basica", origen: "MANUAL" }),
      true,
    );
    expect(d.accion).toBe("CREAR_EXCEPCION");
  });
});

describe("5 · sin datos suficientes no se clasifica", () => {
  it("hace falta nombre Y categoria", () => {
    expect(hayDatosSuficientes("Arroz", "Alimentos")).toBe(true);
    expect(hayDatosSuficientes("Arroz", "")).toBe(false);
    expect(hayDatosSuficientes("", "Alimentos")).toBe(false);
    expect(hayDatosSuficientes("   ", "  ")).toBe(false);
    expect(hayDatosSuficientes(undefined, undefined)).toBe(false);
  });
});

describe("7 · cuando coincide NO se crea una excepcion innecesaria", () => {
  it("guarda null en la tasa, para que el articulo siga heredando", () => {
    const d = decidir(sugerencia({ codigoTasa: "minima" }), estado({ heredada: "minima" }));
    expect(d.accion).toBe("CONFIRMAR_HERENCIA");
    // Lo importante de todo el archivo.
    expect(d.tasaAGuardar).toBeNull();
  });

  it("y tampoco la crea si el articulo ya tenia una excepcion igual a lo heredado", () => {
    const d = decidir(
      sugerencia({ codigoTasa: "basica" }),
      estado({ heredada: "basica", excepcion: "basica", origen: "SUGGESTED" }),
    );
    expect(d.tasaAGuardar).toBeNull();
  });
});
