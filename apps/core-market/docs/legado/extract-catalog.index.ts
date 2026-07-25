// ─────────────────────────────────────────────────────────────────────────────
// extract-catalog — texto (chunk de PDF) → filas de producto, con Gemini.
//
// La API key se busca en el API Vault (tabla public.api_vault) en runtime,
// usando service_role (server-side) — la key NUNCA llega al navegador.
// Fallback: si no está en el Vault, usa el secret GEMINI_API_KEY.
//
// Deploy:  supabase functions deploy extract-catalog
// Vault:   cargá en el módulo API Vault una entrada con
//            platform = "Gemini"  ·  type = "api_key"  ·  value = AIza...
//          (opcional) supabase secrets set EXTRACT_MODEL="gemini-2.0-flash"
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_MODEL = "gemini-2.0-flash";
const VAULT_PLATFORM = "%gemini%"; // match case-insensitive en api_vault.platform

const DEFAULT_FIELDS = [
  "nombre", "descripcion", "marca", "codigo", "numero_parte",
  "ean", "modelo", "precio", "precio_original", "moneda",
  "stock", "imagenes", "categoria",
];

function buildSystem(fields: string[]): string {
  return [
    "Sos un extractor de catálogos de productos. Recibís texto crudo extraído de un PDF",
    "(puede traer ruido: encabezados, horarios de tienda, texto de marketing).",
    "Devolvé EXCLUSIVAMENTE un array JSON válido.",
    "Cada elemento es un producto, con EXACTAMENTE estas claves:",
    JSON.stringify(fields) + ".",
    "Reglas:",
    "- Si un dato no aparece en el texto, poné null. NUNCA lo inventes.",
    "- NUNCA inventes precios: si no hay precio explícito, precio = null.",
    "- Ignorá todo lo que no sea un producto (promos genéricas, direcciones, horarios).",
    "- 'codigo' es el código/SKU del proveedor; 'numero_parte' es el MPN del fabricante;",
    "  'ean'/'gtin' es el código de barras; 'modelo' es el modelo comercial.",
    "- Si no hay productos en este fragmento, devolvé [].",
  ].join("\n");
}

function parseJsonArray(text: string): any[] {
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = t.indexOf("[");
  const end = t.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) t = t.slice(start, end + 1);
  try {
    const parsed = JSON.parse(t);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Busca la API key en el Vault (service_role → ignora RLS, lee la entrada central).
async function getKeyFromVault(): Promise<string | null> {
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data, error } = await admin
      .from("api_vault")
      .select("value")
      .ilike("platform", VAULT_PLATFORM)
      .eq("type", "api_key")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data?.value) return null;
    return data.value as string;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // ── Auth: usuario válido (sólo admins logueados disparan la función) ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "No autorizado" }, 401);

    // ── Input ──
    const { chunk, fields } = await req.json();
    if (!chunk || typeof chunk !== "string") {
      return json({ error: "Se requiere 'chunk' (texto)." }, 400);
    }
    const targetFields: string[] =
      Array.isArray(fields) && fields.length ? fields : DEFAULT_FIELDS;

    // ── Key: Vault primero, secret como fallback ──
    let apiKey = await getKeyFromVault();
    if (!apiKey) apiKey = Deno.env.get("GEMINI_API_KEY") ?? null;
    if (!apiKey) {
      return json({
        error: "No encontré la API key de Gemini. Cargala en el API Vault (platform 'Gemini', type 'api_key') o como secret GEMINI_API_KEY.",
      }, 500);
    }

    const model = Deno.env.get("EXTRACT_MODEL") ?? DEFAULT_MODEL;

    // ── Llamada a Gemini ──
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const resp = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildSystem(targetFields) }] },
        contents: [{ role: "user", parts: [{ text: chunk }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return json({ error: `Gemini ${resp.status}: ${detail.slice(0, 300)}` }, 200);
    }

    const data = await resp.json();
    const textOut =
      (data?.candidates?.[0]?.content?.parts ?? [])
        .map((p: any) => p.text ?? "")
        .join("");

    const rows = parseJsonArray(textOut);
    return json({ rows, count: rows.length }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error inesperado";
    return json({ error: msg }, 200);
  }

  function json(obj: unknown, status: number) {
    return new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
