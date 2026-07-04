"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export interface MarketUser {
  id:    string;
  email: string;
  name:  string;
}

export function useMarketAuth() {
  const [user,      setUser]      = useState<MarketUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Leer sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id:    session.user.id,
          email: session.user.email ?? "",
          name:  session.user.user_metadata?.nombre ?? session.user.email ?? "",
        });
      }
      setIsLoading(false);
    });

    // Escuchar cambios (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id:    session.user.id,
          email: session.user.email ?? "",
          name:  session.user.user_metadata?.nombre ?? session.user.email ?? "",
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string): Promise<{ error?: string }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  }

  async function signUp(email: string, password: string, nombre: string): Promise<{ error?: string }> {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } },
    });
    return error ? { error: error.message } : {};
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function resetPassword(email: string) {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset",
    });
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };
}
