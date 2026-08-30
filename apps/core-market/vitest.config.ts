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
    /* `.tsx` tambien: sin esto, un test que dibuja un componente no corre y
       nadie se entera -no falla, no existe-. Es como se nos pasaron dos veces
       los botones de la barra. */
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["node_modules/**", "supabase/functions/**", "dist/**"],
  },
});
