// apps/core-game/api/auth.ts
//
// Punto de integración con tu proveedor de sesión (Auth.js / Google / Apple /
// email). Implementá getSession según tu setup real. Este stub deja compilar y
// probar, pero devuelve null (sin sesión => /api/* responde 401).
//
// El userId SIEMPRE sale de acá, nunca del body ni de la query. Esa es la regla
// que hace que un enlace compartido no sirva para reclamar el premio de otro.

export interface Session {
  userId: string;
  email?: string;
}

export async function getSession(req: Request): Promise<Session | null> {
  // TODO: validar la cookie/JWT de sesión y devolver { userId }.
  //
  // Ejemplo con Auth.js (NextAuth):
  //   const session = await auth(req);
  //   return session?.user?.id
  //     ? { userId: session.user.id, email: session.user.email ?? undefined }
  //     : null;
  void req;
  return null;
}
