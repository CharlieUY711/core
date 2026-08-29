import { useState, useEffect } from "react";
import { supabase } from "../../../utils/supabase/client";

/**
 * Quién está usando el panel.
 *
 * POR QUÉ `getSession` Y NO `getUser`
 * `getUser()` sale a la red a validar el token contra el servidor, y para eso
 * toma el lock de sesión del navegador. Con varias pestañas abiertas de la
 * misma aplicación —lo normal cuando alguien está trabajando— ese lock lo puede
 * estar reteniendo otra, y entonces la promesa NO falla: se queda esperando.
 * Por eso el panel mostraba "Cargando…" para siempre y después "no se pudo
 * verificar": no había error, había espera.
 *
 * `getSession()` lee la sesión que ya está guardada. No va a la red, no toma
 * lock, y responde siempre.
 *
 * ¿Y LA SEGURIDAD? NO PASA POR ACÁ
 * Este hook decide qué se DIBUJA, no qué se puede hacer. Quien manda es RLS, en
 * cada consulta, del lado del servidor: una sesión falsificada en el navegador
 * no lee ni escribe nada que no le corresponda. Validar el token acá agregaba
 * una espera y ninguna garantía.
 *
 * `onAuthStateChange` mantiene esto al día: si la sesión se renueva o se cierra
 * en otra pestaña, el panel se entera sin recargar.
 */
const ESPERA_MAXIMA_MS = 8_000;

export function useUserRole() {
  const [role,    setRole]    = useState<"admin" | "user" | null>(null);
  const [user,    setUser]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;

    const aplicar = (u: any | null) => {
      if (!vivo) return;
      setUser(u ?? null);
      setRole(u ? (u.user_metadata?.role === "admin" ? "admin" : "user") : null);
    };

    // Aun sin red, esto responde: lee lo guardado. El timeout queda igual por
    // las dudas — una promesa que no resuelve no dispara ningún catch.
    const rendirse = setTimeout(() => {
      if (!vivo) return;
      console.warn("[sesión] getSession() no respondió; se sigue sin usuario.");
      setError("No se pudo leer la sesión guardada.");
      setLoading(false);
    }, ESPERA_MAXIMA_MS);

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (!vivo) return;
        if (error) {
          console.warn("[sesión]", error.message);
          setError(error.message);
        } else {
          aplicar(session?.user ?? null);
        }
      })
      .catch((err) => {
        if (!vivo) return;
        console.warn("[sesión] no se pudo leer la sesión:", err);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!vivo) return;
        clearTimeout(rendirse);
        setLoading(false);
      });

    // Si la sesión cambia —se renueva, se cierra, se inicia en otra pestaña—
    // el panel se entera sin que nadie recargue.
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, session) => {
      aplicar(session?.user ?? null);
      if (session) setError(null);
    });

    return () => {
      vivo = false;
      clearTimeout(rendirse);
      sub.subscription.unsubscribe();
    };
  }, []);

  return { role, user, loading, error, isAdmin: role === "admin" };
}
