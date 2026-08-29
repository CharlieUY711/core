import { useState, useEffect } from "react";
import { supabase } from "../../../utils/supabase/client";

/**
 * Quién está usando el panel.
 *
 * POR QUÉ HAY UN `catch` Y UN TIMEOUT
 * Esto era `getUser().then(...)` a secas. Si esa promesa fallaba —sesión
 * vencida, refresh rechazado, Supabase sin responder— `setLoading(false)` nunca
 * corría y el panel quedaba en "Cargando…" para siempre, sin un mensaje, sin un
 * error en consola, sin forma de salir salvo recargar. Un fallo que se ve como
 * un cuelgue es peor que un fallo que se ve como un fallo.
 *
 * Ahora cualquier final —bien, mal o demasiado lento— apaga el cargando. Sin
 * usuario, el layout manda a la tienda, que es lo correcto: si la sesión no
 * sirve, hay que volver a entrar.
 *
 * El timeout no es paranoia: `getUser()` va a la red, y una promesa que no
 * resuelve no dispara ningún catch. Diez segundos es de sobra para una llamada
 * que normalmente tarda menos de uno.
 */
const ESPERA_MAXIMA_MS = 10_000;

export function useUserRole() {
  const [role,    setRole]    = useState<"admin" | "user" | null>(null);
  const [user,    setUser]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;

    const rendirse = setTimeout(() => {
      if (!vivo) return;
      console.warn("[sesión] getUser() no respondió en 10s; se sigue sin usuario.");
      setError("No se pudo verificar la sesión.");
      setLoading(false);
    }, ESPERA_MAXIMA_MS);

    supabase.auth.getUser()
      .then(({ data: { user }, error }) => {
        if (!vivo) return;
        if (error) {
          // Sesión vencida o token inválido: no es un caso raro, es lo que pasa
          // cuando alguien deja la pestaña abierta desde ayer.
          console.warn("[sesión]", error.message);
          setError(error.message);
        } else if (user) {
          setRole(user.user_metadata?.role === "admin" ? "admin" : "user");
          setUser(user);
        }
      })
      .catch((err) => {
        if (!vivo) return;
        console.warn("[sesión] no se pudo consultar el usuario:", err);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!vivo) return;
        clearTimeout(rendirse);
        setLoading(false);
      });

    return () => { vivo = false; clearTimeout(rendirse); };
  }, []);

  return { role, user, loading, error, isAdmin: role === "admin" };
}
