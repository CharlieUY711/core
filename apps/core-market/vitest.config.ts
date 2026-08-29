/**
 * Vitest corre los tests de la app, no los de las Edge Functions.
 *
 * `supabase/functions/**` es codigo Deno: importa por URL -`https://deno.land/…`-
 * y Node no puede cargar eso. Sus tests se corren con Deno, no con esto.
 * Sin excluirlos, `pnpm test` falla por dos archivos que nunca fueron para el.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules/**", "supabase/functions/**", "dist/**"],
  },
});
