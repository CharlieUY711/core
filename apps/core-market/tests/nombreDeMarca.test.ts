/**
 * El nombre de la marca tiene que distinguir a las homonimas.
 *
 * Casos reales: buscando "Santalaura logo" Google devuelve cuatro empresas
 * distintas que comparten el nombre, cada una con su dominio. Elegir el logo
 * es elegir CUAL, asi que el nombre no puede colapsar a "Santalaura".
 */
import { describe, it, expect } from "vitest";
import { nombreDeMarca, marcaElegida } from "../src/app/admin/utils/marcasSync";

describe("marcas homonimas", () => {
  it("conserva lo que las distingue", () => {
    expect(nombreDeMarca("www.santalaura.uy", "Olivares de Santa Laura"))
      .toBe("Olivares de Santa Laura");
    expect(nombreDeMarca("santalaura.ind.br", "Cerealista Santa Laura — Premium Peanut"))
      .toBe("Cerealista Santa Laura");
    // Este el dominio no lo delata -"slaura" es una abreviatura- asi que en la
    // LISTA queda por el dominio. Al ELEGIR el logo, gana el titulo.
    expect(nombreDeMarca("www.slaura.com", "Agrícola Santa Laura - Paltas Hass"))
      .toBe("Slaura");
    expect(marcaElegida("www.slaura.com", "Agrícola Santa Laura - Paltas Hass"))
      .toBe("Agrícola Santa Laura");
  });
});

describe("y sigue descartando lo que no es la marca", () => {
  it("una seccion del sitio no es el nombre", () => {
    expect(nombreDeMarca("www.apple.com", "App Store - Apple (ES)")).toBe("Apple");
  });
  it("cuando el titulo nombra al dominio, se usa el titulo", () => {
    expect(nombreDeMarca("colinasdegarzon.com", "Colinas de Garzón – El aceite"))
      .toBe("Colinas de Garzón");
    expect(nombreDeMarca("www.apple.com", "Apple")).toBe("Apple");
  });
});

describe("elegir el logo define la marca", () => {
  it("el titulo gana, porque el usuario miro el logo y dijo cual es", () => {
    expect(marcaElegida("www.santalaura.uy", "Olivares de Santa Laura"))
      .toBe("Olivares de Santa Laura");
    expect(marcaElegida("santalaura.ind.br", "Cerealista Santa Laura — Premium Peanut"))
      .toBe("Cerealista Santa Laura");
  });
  it("salvo que el titulo no sirva como nombre", () => {
    expect(marcaElegida("www.apple.com", "")).toBe("Apple");
    expect(marcaElegida("www.apple.com", null)).toBe("Apple");
  });
});
