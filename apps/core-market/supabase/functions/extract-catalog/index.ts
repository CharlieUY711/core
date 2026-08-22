// extract-catalog — texto (chunk de PDF) → filas de producto, con Groq (gratis).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCredential } from "../_shared/api-vault/CredentialProvider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_MODEL = "llama-3.3-70b-versatile";

const DEFAULT_FIELDS = [
  "nombre", "descripcion", "marca", "codigo", "numero_parte",
  "ean", "modelo", "precio", "precio_original", "moneda",
  "stock", "imagenes", "categoria",
];

function buildSystem(fields: string[]): string {
  return [
    "Sos un extractor de catálogos de productos. Recibís texto crudo extraído de un PDF",
    "(puede traer ruido: encabezados, horarios de tienda, texto de marketing).",
    "Respondé SOLO con un objeto JSON con la forma: {\"products\": [ ... ]}.",
    "Cada producto del array tiene EXACTAMENTE estas claves:",
    JSON.stringify(fields) + ".",
    "Reglas:",
    "- Si un dato no aparece en el texto, poné null. NUNCA lo inventes.",
    "- NUNCA inventes precios: si no hay precio explícito, precio = null.",
    "- Ignorá todo lo que no sea un producto (promos genéricas, direcciones, horarios).",
    "- 'codigo' es el código/SKU del proveedor; 'numero_parte' es el MPN del fabricante;",
    "  'ean'/'gtin' es el código de barras; 'modelo' es el modelo comercial.",
    "- Si no hay productos en este fragmento, devolvé {\"products\": []}.",
  ].join("\n");
}

function extractRows(text: string): any[] {
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    const parsed = JSON.parse(t);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.products)) return parsed.products;
    if (Array.isArray(parsed?.items)) return parsed.items;
    return [];
  } catch {
    const s = t.indexOf("[");
    const e = t.lastIndexOf("]");
    if (s !== -1 && e > s) {
      try { const a = JSON.parse(t.slice(s, e + 1)); return Array.isArray(a) ? a : []; } catch { /* noop */ }
    }
    return [];
  }
}

// DEC-011: migrado al RESOLVE generico del Credential Provider. Este caso
// (una API key global, sin tenant, buscada por nombre exacto de plataforma)
// encaja de lleno en el contrato de resolveCredential -- a diferencia del
// caso de ml-webhook, que era un descubrimiento por tenant_id y por eso
// quedo con su query directa (ver .agent/DECISIONS.md, DEC-011).
//
// Cambio de comportamiento minimo y deliberado: el `.ilike("platform", "%groq%")`
// original matcheaba cualquier plataforma que CONTUVIERA "groq"; se reemplaza
// por una igualdad exacta contra "Groq" (el nombre tal cual aparece en
// VAULT_PLATFORM_DEFS, apiVaultTypes.ts). Si en el futuro hay mas de una fila
// "Groq" global, RESOLVE ya no puede elegir "la mas reciente" (no ordena por
// updated_at) -- ese caso no esta contemplado hoy (constraint unico
// api_vault_platform_global_uidx impide dos filas Groq globales), pero queda
// documentado por si cambia.
async function getKeyFromVault(): Promise<string | null> {
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const resolved = await resolveCredential(admin, { platform: "Groq", type: "api_key" });
    return resolved?.value ?? null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 200);
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "No autorizado" }, 200);

    const { chunk, fields } = await req.json();
    if (!chunk || typeof chunk !== "string") return json({ error: "Se requiere 'chunk' (texto)." }, 200);
    const targetFields: string[] = Array.isArray(fields) && fields.length ? fields : DEFAULT_FIELDS;

    let apiKey = await getKeyFromVault();
    if (!apiKey) apiKey = Deno.env.get("GROQ_API_KEY") ?? null;
    if (!apiKey) return json({ error: "No encontré la API key de Groq (Vault 'Groq'/api_key o secret GROQ_API_KEY)." }, 200);

    const model = Deno.env.get("EXTRACT_MODEL") ?? DEFAULT_MODEL;
    const payload = JSON.stringify({
      model, temperature: 0, response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystem(targetFields) },
        { role: "user", content: chunk },
      ],
    });

    let resp: Response | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", "authorization": `Bearer ${apiKey}` },
        body: payload,
      });
      if (resp.status !== 429) break;
      const ra = resp.headers.get("retry-after");
      const detail = await resp.text();
      const m = detail.match(/try again in ([\d.]+)\s*s/i);
      let waitMs = ra ? parseFloat(ra) * 1000 : (m ? parseFloat(m[1]) * 1000 : 5000);
      waitMs = Math.min(Math.ceil(waitMs) + 800, 30000);
      if (attempt === 3) return json({ error: `Groq 429 (sin cupo tras reintentos): ${detail.slice(0, 200)}` }, 200);
      await new Promise((r) => setTimeout(r, waitMs));
    }

    if (!resp || !resp.ok) {
      const detail = resp ? await resp.text() : "sin respuesta";
      return json({ error: `Groq ${resp?.status ?? "?"}: ${detail.slice(0, 300)}` }, 200);
    }

    const data = await resp.json();
    const textOut = data?.choices?.[0]?.message?.content ?? "";
    const rows = extractRows(textOut);
    return json({ rows, count: rows.length }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error inesperado";
    return json({ error: msg }, 200);
  }

  function json(obj: unknown, status: number) {
    return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
