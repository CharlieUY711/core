/**
 * Lo que separa un producto de una pagina del fabricante.
 *
 * Los casos salen de resultados reales: buscando "Colinas de Garzon aceite de
 * oliva" Google devuelve el catalogo de cuatro tiendas, la portada de la marca,
 * su Instagram y una nota de prensa. Solo los primeros son articulos.
 */
import { describe, it, expect } from "vitest";
import { puntajeDeProducto } from "../src/app/admin/utils/articulosDeMarca";

describe("la URL dice si es un producto", () => {
  it("los caminos de catalogo puntuan alto", () => {
    for (const u of [
      "https://licoreriapreciados.com/producto/aceite-de-oliva-colinas-de-garzon",
      "https://www.elnaranjo.com.uy/productos/aceites/aceite-de-oliva",
      "https://www.tiendainglesa.com.uy/supermercado/aceite-de-oliva-extra-virgen",
      "https://www.lamolienda.uy/alimentos/aceite-de-oliva",
    ]) expect(puntajeDeProducto(u)).toBeGreaterThanOrEqual(1);
  });

  it("la portada nunca es un producto", () => {
    expect(puntajeDeProducto("https://colinasdegarzon.com/")).toBe(-1);
  });

  it("las secciones del sitio tampoco", () => {
    for (const u of [
      "https://colinasdegarzon.com/turismo",
      "https://colinasdegarzon.com/calidad",
      "https://bodegagarzon.com/es/noticias/comunicados-de-prensa",
      "https://colinasdegarzon.com/nosotros",
    ]) expect(puntajeDeProducto(u)).toBe(-1);
  });

  it("un camino de producto le gana a uno neutro", () => {
    expect(puntajeDeProducto("https://x.com/producto/aceite"))
      .toBeGreaterThan(puntajeDeProducto("https://x.com/algo/aceite"));
  });
});

describe("las secciones del fabricante no son productos", () => {
  it("el indice del catalogo no es un producto", () => {
    expect(puntajeDeProducto("https://www.santalaura.uy/productos", "Productos")).toBe(-1);
    expect(puntajeDeProducto("https://www.lamolienda.uy/alimentos", "Santa Laura")).toBe(-1);
  });

  it("las paginas institucionales tampoco", () => {
    expect(puntajeDeProducto("https://www.santalaura.uy/donde-estamos", "Donde estamos - Olivares de Santa Laura")).toBe(-1);
    expect(puntajeDeProducto("https://www.santalaura.uy/cultura-y-salud", "Cultura y Salud")).toBe(-1);
  });

  it("pero los productos reales siguen pasando", () => {
    expect(puntajeDeProducto("https://iber.uy/shop/product/724-aceite-olivares", "ACEITE OLIVARES DE SANTA LAURA")).toBe(2);
    expect(puntajeDeProducto("https://www.bigbox.com.uy/regalos/mix/blend-uy/olivares", "Seleccion de aceites")).toBeGreaterThan(0);
  });
});
