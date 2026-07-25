// src/components/auth/AuthGuard.tsx
import type { ReactNode } from "react";
import { useAuth } from "../../hooks/useAuth";
import { LoginPage } from "./LoginPage";

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * Envuelve la app: mientras se resuelve la sesión muestra un loader,
 * si no hay sesión muestra el login (magic link), y si hay sesión
 * renderiza children con normalidad.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm">Verificando sesión…</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
