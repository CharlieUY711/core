// supabase/functions/orquesta-generate/index.ts
//
// Edge Function (Deno) que:
//   1. Verifica el JWT del usuario que llama.
//   2. Lee la key de Anthropic (y de OpenAI como fallback) desde api_vault
//      usando el SERVICE_ROLE_KEY (nunca expuesto al frontend).
//   3. Llama a Anthropic; si falla, cae a OpenAI.
//   4. Devuelve el resultado al frontend.
//
// Deploy:
//   supabase functions deploy orquesta-generate
//
// Invocación desde el frontend (ver src/hooks/useAI.ts):
//   supabase.functions.invoke('orquesta-generate', { body: { prompt, motorId, companyId } })

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const OPENAI_MODEL = "gpt-4o-mini";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  prompt: string;
  motorId?: string;
  companyId?: string;
  system?: string;
  maxTokens?: number;
}

interface VaultEntry {
  platform: string; // 'Anthropic' | 'OpenAI'
  api_key: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Verificar JWT del usuario ──────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError("No autorizado: falta el header Authorization", 401);
    }

    // Cliente "de usuario" (respeta RLS) solo para validar el JWT.
    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (userError || !user) {
      return jsonError("No autorizado: sesión inválida o expirada", 401);
    }

    const body: GenerateRequest = await req.json();
    if (!body?.prompt) {
      return jsonError("Falta 'prompt' en el body", 400);
    }

    // ── 2. Leer keys desde api_vault con el service role ──────────────────
    // Cliente admin: bypassa RLS, solo lo usamos server-side para leer vault.
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: vaultRows, error: vaultError } = await adminClient
      .from("api_vault")
      .select("platform, api_key")
      .in("platform", ["Anthropic", "OpenAI"]);

    if (vaultError) {
      return jsonError(`Error leyendo api_vault: ${vaultError.message}`, 500);
    }

    const entries = (vaultRows ?? []) as VaultEntry[];
    const anthropicKey = entries.find((e) => e.platform === "Anthropic")?.api_key;
    const openaiKey = entries.find((e) => e.platform === "OpenAI")?.api_key;

    if (!anthropicKey && !openaiKey) {
      return jsonError(
        "No hay keys configuradas en api_vault para Anthropic ni OpenAI",
        500
      );
    }

    const system =
      body.system ??
      "Sos el motor de IA de core-orquesta. Respondé de forma concisa y en español.";
    const maxTokens = body.maxTokens ?? 1024;

    // ── 3. Anthropic primero, OpenAI como fallback ─────────────────────────
    let result: { text: string; provider: "anthropic" | "openai" } | null = null;
    let lastError: string | null = null;

    if (anthropicKey) {
      try {
        result = await callAnthropic(anthropicKey, {
          system,
          prompt: body.prompt,
          maxTokens,
        });
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.error("Anthropic falló, probando fallback OpenAI:", lastError);
      }
    }

    if (!result && openaiKey) {
      try {
        result = await callOpenAI(openaiKey, {
          system,
          prompt: body.prompt,
          maxTokens,
        });
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.error("OpenAI (fallback) también falló:", lastError);
      }
    }

    if (!result) {
      return jsonError(
        `Ambos proveedores de IA fallaron. Último error: ${lastError}`,
        502
      );
    }

    // ── 4. (Opcional) guardar como documento generado ──────────────────────
    if (body.companyId) {
      await adminClient.from("orquesta_documents").insert({
        company_id: body.companyId,
        user_id: user.id,
        title: `Generado por ${result.provider} — ${new Date().toLocaleString("es-UY")}`,
        type: "brief",
        content: result.text,
        pages: 1,
      });
    }

    return new Response(
      JSON.stringify({
        text: result.text,
        provider: result.provider,
        motorId: body.motorId ?? null,
        companyId: body.companyId ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error inesperado en orquesta-generate:", err);
    return jsonError(
      err instanceof Error ? err.message : "Error inesperado",
      500
    );
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callAnthropic(
  apiKey: string,
  opts: { system: string; prompt: string; maxTokens: number }
): Promise<{ text: string; provider: "anthropic" }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text =
    data.content
      ?.filter((block: { type: string }) => block.type === "text")
      .map((block: { text: string }) => block.text)
      .join("\n") ?? "";

  return { text, provider: "anthropic" };
}

async function callOpenAI(
  apiKey: string,
  opts: { system: string; prompt: string; maxTokens: number }
): Promise<{ text: string; provider: "openai" }> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: opts.maxTokens,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.prompt },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";

  return { text, provider: "openai" };
}
