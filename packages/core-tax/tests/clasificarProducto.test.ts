/**
 * Los casos que tienen que seguir andando.
 *
 * No son "tests de que el código corre": son los casos que motivaron cada
 * decisión. Si alguno se rompe, se rompió una decisión, no una línea.
 */
import { describe, it, expect } from "vitest";
import { clasificarProducto } from "../src/application/clasificarProducto";
import { FUENTES } from "../src/rules/fuentes";

describe("casos conocidos de tasa mínima", () => {
  it("arroz con categoría de alimentos: mínima y confianza alta", () => {
    const r = clasificarProducto({ nombre: "Arroz blanco 1 kg", categoria: "Alimentos" });
    expect(r.codigoTasa).toBe("minima");
    expect(r.confianza).toBe("ALTA");
    expect(r.estado).toBe("SUGGESTED");
    expect(r.reglas).toContain("FOOD_ARROZ");
  });

  it("cita la fuente normativa, no sólo la tasa", () => {
    const r = clasificarProducto({ nombre: "Yerba mate 1 kg", categoria: "Almacén" });
    expect(r.fuente?.referencia).toContain("Título 10");
    expect(r.razon.length).toBeGreaterThan(0);
  });
});

describe("una sola señal nunca da confianza alta", () => {
  it("arroz sin categoría: acierta la tasa pero baja la confianza", () => {
    const r = clasificarProducto({ nombre: "Arroz blanco 1 kg" });
    expect(r.codigoTasa).toBe("minima");
    expect(r.confianza).toBe("MEDIA");
    expect(r.razon).toContain("confirmarlo");
  });
});

describe("los descartes separan el alimento de lo que sólo lo nombra", () => {
  it("vinagre de arroz NO es arroz", () => {
    const r = clasificarProducto({ nombre: "Vinagre de arroz 500 ml", categoria: "Alimentos" });
    expect(r.reglas).not.toContain("FOOD_ARROZ");
    expect(r.codigoTasa).toBe("basica");
  });

  it("aceite de motor NO es aceite comestible", () => {
    const r = clasificarProducto({ nombre: "Aceite de motor 10W40", categoria: "Automotor" });
    expect(r.reglas).not.toContain("FOOD_ACEITE");
    expect(r.codigoTasa).toBe("basica");
  });

  it("pasta dental NO es pasta", () => {
    const r = clasificarProducto({ nombre: "Pasta dental blanqueadora", categoria: "Higiene" });
    expect(r.reglas).not.toContain("FOOD_FIDEOS");
    expect(r.codigoTasa).toBe("basica");
  });

  it("una cafetera NO es café", () => {
    const r = clasificarProducto({ nombre: "Cafetera express", categoria: "Electrodomésticos" });
    expect(r.reglas).not.toContain("FOOD_CAFE");
  });
});

describe("productos estándar", () => {
  it("notebook: tasa básica, y con señal positiva la confianza es alta", () => {
    const r = clasificarProducto({ nombre: 'Notebook Lenovo 15"', categoria: "Electrónica" });
    expect(r.codigoTasa).toBe("basica");
    expect(r.confianza).toBe("ALTA");
    expect(r.reglas).toContain("STANDARD_ELECTRONICA");
  });

  it("algo desconocido cae en básica, pero NO con confianza alta", () => {
    const r = clasificarProducto({ nombre: "Kit especial de limpieza" });
    expect(r.codigoTasa).toBe("basica");
    expect(r.confianza).toBe("MEDIA");
    expect(r.reglas).toContain("STANDARD_RATE");
  });
});

describe("el motor no inventa", () => {
  it("sin nombre: pide revisión en vez de devolver una tasa", () => {
    const r = clasificarProducto({ nombre: "  " });
    expect(r.estado).toBe("REVIEW_REQUIRED");
    expect(r.codigoTasa).toBeNull();
  });

  it("señales contradictorias: pide revisión y dice cuáles chocaron", () => {
    // "libro" (exento) y "notebook" (básica) en el mismo nombre.
    const r = clasificarProducto({
      nombre: "Libro de electrónica para notebook",
      categoria: "Librería",
    });
    expect(r.estado).toBe("REVIEW_REQUIRED");
    expect(r.codigoTasa).toBeNull();
    expect(r.reglas.length).toBeGreaterThan(1);
  });
});

describe("exento no es lo mismo que 0%", () => {
  it("un libro se clasifica como exento, no como una tasa numérica", () => {
    const r = clasificarProducto({ nombre: "Libro de cocina", categoria: "Librería" });
    expect(r.codigoTasa).toBe("exento");
    expect(r.fuente?.id).toBe("IVA_EXONERACIONES");
  });
});

describe("auditoría", () => {
  it("toda clasificación dice qué versión del motor la produjo", () => {
    const r = clasificarProducto({ nombre: "Arroz", categoria: "Alimentos" });
    expect(r.versionMotor).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("las fuentes declaran si están verificadas por un profesional", () => {
    // Hoy ninguna lo está, y el motor lo devuelve en vez de disimularlo.
    for (const f of Object.values(FUENTES)) {
      expect(typeof f.verificado).toBe("boolean");
    }
  });
});
