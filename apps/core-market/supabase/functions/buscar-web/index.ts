// buscar-web — búsqueda genérica en la web (Serper.dev, resultados de Google).
//
// Es la ÚNICA función de búsqueda web de la app: no hay una versión para
// marca y otra para artículo, ni una aparte para imágenes o videos. Recibe
// un texto y un `tipo` opcional ("web" | "images" | "videos", default
// "web") y devuelve resultados normalizados al mismo formato; quien la
// llama decide qué hacer con ellos. Los canales (Mercado Libre, etc.) son
// una fuente aparte que el cliente combina DESPUÉS de esto — acá no se
// sabe que existen, así que agregar un canal nuevo no toca este archivo.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCredential, reportCredentialOutcome } from "../_shared/api-vault/CredentialProvider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Tipo = "web" | "images" | "videos";

interface ResultadoBusqueda {
  nombre: string;
  imagen: string | null;
  url: string | null;
  descripcion: string | null;
  fuente: "web";
}

// Un tipo -> el endpoint de Serper que lo resuelve. Los tres devuelven un
// JSON con forma distinta; se normaliza cada uno a la misma interfaz de
// salida más abajo, así el cliente no necesita saber que son endpoints
// distintos.
const ENDPOINT: Record<Tipo, string> = {
  web:    "https://google.serper.dev/search",
  images: "https://google.serper.dev/images",
  videos: "https://google.serper.dev/videos",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 200);
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "No autorizado" }, 200);

    const body = await req.json();
    const query = body?.query;
    const tipo: Tipo = body?.tipo === "images" || body?.tipo === "videos" ? body.tipo : "web";
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return json({ resultados: [] as ResultadoBusqueda[] }, 200);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const cred = await resolveCredential(admin, { platform: "Serper.dev", type: "api_key" });
    if (!cred) {
      return json({ error: "No hay una API key de Serper.dev cargada en el Vault." }, 200);
    }

    const resp = await fetch(ENDPOINT[tipo], {
      method: "POST",
      headers: { "X-API-KEY": cred.value, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query.trim(), gl: "uy", hl: "es" }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      await reportCredentialOutcome(admin, {
        credentialId: cred.credentialId,
        outcome: resp.status === 401 || resp.status === 403 ? "invalid" : "error",
        error: `Serper ${resp.status}: ${detail.slice(0, 200)}`,
      }).catch(() => {});
      return json({ error: `Serper.dev ${resp.status}: ${detail.slice(0, 200)}` }, 200);
    }

    const data = await resp.json();
    await reportCredentialOutcome(admin, { credentialId: cred.credentialId, outcome: "active" }).catch(() => {});

    const resultados: ResultadoBusqueda[] = [];

    if (tipo === "images") {
      for (const r of Array.isArray(data?.images) ? data.images : []) {
        if (!r?.imageUrl) continue;
        resultados.push({
          nombre:      r.title ?? "",
          imagen:      r.imageUrl,
          url:         r.link ?? null,
          descripcion: r.source ?? null,
          fuente:      "web",
        });
      }
    } else if (tipo === "videos") {
      for (const r of Array.isArray(data?.videos) ? data.videos : []) {
        if (!r?.link) continue;
        resultados.push({
          nombre:      r.title ?? "",
          imagen:      r.imageUrl ?? null,
          url:         r.link,
          descripcion: r.snippet ?? r.channel ?? null,
          fuente:      "web",
        });
      }
    } else {
      // El knowledge graph es lo más parecido a "encontré la marca/entidad
      // exacta": nombre canónico, logo e imagen de mejor calidad que un
      // resultado orgánico cualquiera. Cuando existe, va primero.
      const kg = data?.knowledgeGraph;
      if (kg?.title) {
        resultados.push({
          nombre:      kg.title,
          imagen:      kg.imageUrl ?? null,
          url:         kg.website ?? kg.descriptionLink ?? null,
          descripcion: kg.description ?? null,
          fuente:      "web",
        });
      }

      for (const r of Array.isArray(data?.organic) ? data.organic : []) {
        if (!r?.title) continue;
        resultados.push({
          nombre:      r.title,
          imagen:      r.imageUrl ?? null,
          url:         r.link ?? null,
          descripcion: r.snippet ?? null,
          fuente:      "web",
        });
      }
    }

    return json({ resultados: resultados.slice(0, 10) }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error inesperado";
    return json({ error: msg }, 200);
  }

  function json(obj: unknown, status: number) {
    return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
