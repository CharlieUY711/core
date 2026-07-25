// src/components/auth/LoginPage.tsx
//
// Login vía Supabase Auth (magic link) — no implementamos un sistema de
// login propio, delegamos todo en supabase.auth.signInWithOtp.

import { useState, type FormEvent } from "react";
import { useAuth } from "../../hooks/useAuth";

export function LoginPage() {
  const { signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("sending");
    setErrorMsg(null);

    const { error } = await signInWithMagicLink(email);

    if (error) {
      setStatus("error");
      setErrorMsg(error);
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-foreground">core-orquesta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Iniciá sesión con tu email para continuar
          </p>
        </div>

        {status === "sent" ? (
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-center text-sm text-foreground">
            Te enviamos un link de acceso a <strong>{email}</strong>.
            <br />
            Revisá tu casilla y hacé clic para entrar.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {status === "error" && errorMsg && (
              <p className="text-sm text-destructive">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {status === "sending" ? "Enviando…" : "Enviar link de acceso"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
