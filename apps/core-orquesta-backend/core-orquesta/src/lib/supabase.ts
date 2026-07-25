// src/lib/supabase.ts
//
// Cliente Supabase del lado del browser.
//
// Si esta app termina viviendo dentro del monorepo CORE, reemplazar este
// archivo por un re-export de `@core/bep-supabase` para compartir el mismo
// cliente/proyecto que BEP. Mientras tanto queda self-contained con
// @supabase/supabase-js para poder correr standalone.

import { createClient } from "@supabase/supabase-js";

// Nota: no parametrizamos createClient<Database>(...) a propósito. La versión
// de @supabase/postgrest-js instalada exige una forma de Database más estricta
// (incluyendo Relationships/Views/Functions y metadata interna de versión)
// que agrega fricción sin aportar valor real acá. Los tipos de fila fuertes
// (MotorRow, CompanyRow, etc.) siguen definidos en orquesta.types.ts y se
// aplican explícitamente en cada hook al leer/escribir.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // No tiramos error duro en build/import para no romper el design-system
  // preview cuando no hay .env configurado, pero sí avisamos fuerte en consola.
  // eslint-disable-next-line no-console
  console.error(
    "[core-orquesta] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en el .env.local. " +
      "Copiá .env.local.example y completá los valores del proyecto Supabase."
  );
}

export const supabase = createClient(
  supabaseUrl ?? "",
  supabaseAnonKey ?? "",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
