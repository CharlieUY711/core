// src/hooks/useAI.ts
import { useCallback, useState } from "react";
import { supabase } from "../lib/supabase";

interface GenerateParams {
  prompt: string;
  motorId?: string;
  companyId?: string;
  system?: string;
  maxTokens?: number;
}

interface GenerateResult {
  text: string;
  provider: "anthropic" | "openai";
  motorId: string | null;
  companyId: string | null;
}

interface UseAIResult {
  generate: (params: GenerateParams) => Promise<GenerateResult | null>;
  loading: boolean;
  error: string | null;
}

/**
 * Llama a la Edge Function `orquesta-generate`, que resuelve la key de
 * Anthropic/OpenAI del lado del servidor (api_vault) y nunca expone
 * las keys al frontend. Ver supabase/functions/orquesta-generate.
 */
export function useAI(): UseAIResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (params: GenerateParams): Promise<GenerateResult | null> => {
      setLoading(true);
      setError(null);

      const { data, error: invokeError } = await supabase.functions.invoke(
        "orquesta-generate",
        { body: params }
      );

      setLoading(false);

      if (invokeError) {
        setError(invokeError.message);
        return null;
      }

      if (data?.error) {
        setError(data.error);
        return null;
      }

      return data as GenerateResult;
    },
    []
  );

  return { generate, loading, error };
}
