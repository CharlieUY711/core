/**
 * Regresión de DEC-013.
 *
 * El bug: `crear_publicacion` dejó de escribir una fila en
 * `catalog_canal_listing` para los canales 'market'/'secondhand' (correcto,
 * DEC-012), pero `catalog_vidriera` seguía exigiendo esa fila con un INNER
 * JOIN (desactualizado desde el 22/08). Resultado: cero productos nuevos
 * visibles en la home, sin ningún error visible en ningún lado.
 *
 * Esto es un test de INTEGRACIÓN, no unitario: ejercita las funciones SQL
 * reales (`crear_publicacion` y `catalog_vidriera`) contra un proyecto
 * Supabase de verdad, porque el bug vive en el join entre dos RPCs, no en
 * ninguna lógica de `src/` que se pueda mockear con sentido. Un test que
 * mockeara el cliente de Supabase habría dado "pasa" con el bug adentro —
 * es exactamente el tipo de falla silenciosa que este test existe para
 * atrapar.
 *
 * Requiere:
 *   - VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY apuntando a un proyecto de
 *     staging/test (NUNCA producción).
 *   - Una sesión autenticada con claim `store_id` en el JWT (ver
 *     20260822000000_store_membership_and_jwt_claim.sql) — sin eso,
 *     `crear_publicacion` rechaza con 42501 antes de llegar al bug.
 *
 * Sin esas dos cosas el test se salta (no falla, no bloquea CI local) —
 * ver `describe.skipIf` abajo. Correrlo de verdad es responsabilidad de
 * quien tenga acceso a un proyecto de staging antes de mergear DEC-013.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
// Credenciales de una sesión de prueba con tienda activa. Nunca hardcodear
// esto: se toma de env, y si falta, el test se salta en vez de fallar.
const TEST_EMAIL = process.env.VIDRIERA_TEST_EMAIL;
const TEST_PASSWORD = process.env.VIDRIERA_TEST_PASSWORD;

const puedeCorrer = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && TEST_EMAIL && TEST_PASSWORD);

describe.skipIf(!puedeCorrer)(
  "DEC-013 · catalog_vidriera no depende de catalog_canal_listing para market/secondhand",
  () => {
    let supabase: SupabaseClient;
    let variantId: string;

    beforeAll(async () => {
      supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
      const { error } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL!,
        password: TEST_PASSWORD!,
      });
      if (error) throw new Error(`No se pudo autenticar la sesión de test: ${error.message}`);
    });

    it("un producto 'market' recién creado con status activo aparece en la vidriera", async () => {
      const titulo = `DEC-013 test ${Date.now()}`;

      const { data: nuevaVariante, error: eCrear } = await supabase.rpc("crear_publicacion", {
        p_title: titulo,
        p_price: 100,
        p_tipo: "market",
        p_currency: "UYU",
        p_stock: 1,
        p_channels: [],       // exactamente como lo manda el frontend real
        p_status: "active",   // esto es lo que la vendedora ve como "publicado"
      });
      expect(eCrear, eCrear?.message).toBeNull();
      expect(nuevaVariante).toBeTruthy();
      variantId = nuevaVariante as unknown as string;

      // Precondición del bug: NO debe existir fila de canal para
      // market/secondhand. Si esto falla, `crear_publicacion` cambió de
      // comportamiento y el resto del test ya no prueba lo que dice probar.
      const { data: listings, error: eListings } = await supabase
        .from("catalog_canal_listing")
        .select("channel")
        .eq("variante_id", variantId);
      expect(eListings, eListings?.message).toBeNull();
      expect((listings ?? []).some(l => l.channel === "market")).toBe(false);

      // La prueba real: sin esa fila, catalog_vidriera debe encontrarlo igual.
      const { data: vidriera, error: eVidriera } = await supabase.rpc("catalog_vidriera", {
        p_currency: "UYU",
        p_limit: 500,
        p_ids: [variantId],
      });
      expect(eVidriera, eVidriera?.message).toBeNull();
      expect(vidriera).toHaveLength(1);
      expect(vidriera![0].nombre).toBe(titulo);
      expect(vidriera![0].tipo).toBe("market");
    });

    it("un producto en 'draft' NO aparece en la vidriera (la regla sigue siendo status, no el canal)", async () => {
      const { data: draftVariante, error } = await supabase.rpc("crear_publicacion", {
        p_title: `DEC-013 draft ${Date.now()}`,
        p_price: 100,
        p_tipo: "market",
        p_status: "draft",
      });
      expect(error, error?.message).toBeNull();

      const { data: vidriera } = await supabase.rpc("catalog_vidriera", {
        p_ids: [draftVariante as unknown as string],
      });
      expect(vidriera ?? []).toHaveLength(0);
    });
  },
);
