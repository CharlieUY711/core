// =============================================================================
// supabase/functions/whatsapp-gate/index.ts
//
// Webhook de WhatsApp Cloud API para el "gate" de Configuraciones y usos.
//
// Flujo:
//   1. El destinatario elegido escribe al número conectado.
//   2. Si todavía no pasó, recibe las opciones (con su imagen, si la tienen).
//   3. Si toca la opción correcta → queda habilitado y el chat sigue.
//   4. Si toca otra → recibe el link de esa opción (url) y queda "redirected".
//   5. Cualquier otro número, o un gate apagado → se ignora: este webhook no
//      toca conversaciones que nadie configuró.
//
// Las claves salen del API Vault (filas marcadas "Sólo servidor"), leídas con la
// service role, que sólo corre en el servidor:
//   META_APP_SECRET        (plataforma Meta) comprueba la firma
//                          X-Hub-Signature-256: sin esa comprobación cualquiera
//                          podría hacerle creer a la función que un mensaje vino
//                          de WhatsApp.
//   WA_GATE_VERIFY_TOKEN   (plataforma Meta) el mismo texto que se pone en Meta
//                          al registrar el webhook.
// Si alguna no está en el Vault se usa el secreto de Supabase del mismo nombre,
// para no romper un despliegue que ya lo tenía.
//
// El token de WhatsApp NO está acá: se lee del API Vault del dueño del número
// (WHATSAPP_ACCESS_TOKEN), con la service role, que sólo corre en el servidor.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GRAPH = "https://graph.facebook.com/v21.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ── Claves del Vault ─────────────────────────────────────────────────────────

/** Lee una credencial de servidor del Vault; si no está, el secreto de Supabase. */
async function claveDeServidor(nombre: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("api_vault")
    .select("value")
    .eq("platform", "Meta")
    .eq("name", nombre)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) console.error(`[whatsapp-gate] no se pudo leer ${nombre} del Vault:`, error.message);
  return data?.value?.trim() || Deno.env.get(nombre) || null;
}

// ── Firma ────────────────────────────────────────────────────────────────────

async function firmaValida(raw: string, header: string | null): Promise<boolean> {
  const secreto = await claveDeServidor("META_APP_SECRET");
  if (!secreto || !header?.startsWith("sha256=")) return false;

  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secreto),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  const esperada = Array.from(mac).map(b => b.toString(16).padStart(2, "0")).join("");
  const recibida = header.slice(7);

  // Comparación en tiempo constante.
  if (esperada.length !== recibida.length) return false;
  let diff = 0;
  for (let i = 0; i < esperada.length; i++) diff |= esperada.charCodeAt(i) ^ recibida.charCodeAt(i);
  return diff === 0;
}

// ── Envío ────────────────────────────────────────────────────────────────────

type Creds = { token: string; phoneNumberId: string };

async function enviar(c: Creds, to: string, payload: Record<string, unknown>) {
  const res = await fetch(`${GRAPH}/${c.phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${c.token.trim()}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to, ...payload }),
  });
  if (!res.ok) console.error("[whatsapp-gate] envío falló:", res.status, await res.text());
}

const texto = (c: Creds, to: string, body: string) =>
  enviar(c, to, { type: "text", text: { body } });

type Opcion = {
  id: string; position: number; label: string;
  is_correct: boolean; action_url: string | null; image_url: string | null;
};

/**
 * Las opciones, en la forma que WhatsApp permite:
 *  - con imágenes: un mensaje por opción (un mensaje interactivo admite UNA
 *    imagen de encabezado), cada uno con su botón "Elegir";
 *  - sin imágenes y hasta 3: un solo mensaje con botones;
 *  - sin imágenes y más de 3: una lista (hasta 10).
 */
async function mostrarOpciones(c: Creds, to: string, prompt: string, ops: Opcion[]) {
  const conImagen = ops.some(o => o.image_url);

  if (conImagen) {
    await texto(c, to, prompt);
    for (const o of ops) {
      await enviar(c, to, {
        type: "interactive",
        interactive: {
          type: "button",
          ...(o.image_url ? { header: { type: "image", image: { link: o.image_url } } } : {}),
          body: { text: o.label },
          action: { buttons: [{ type: "reply", reply: { id: `gate:${o.id}`, title: "Elegir" } }] },
        },
      });
    }
    return;
  }

  if (ops.length <= 3) {
    await enviar(c, to, {
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: prompt },
        action: {
          buttons: ops.map(o => ({ type: "reply", reply: { id: `gate:${o.id}`, title: o.label } })),
        },
      },
    });
    return;
  }

  await enviar(c, to, {
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: prompt },
      action: {
        button: "Ver opciones",
        sections: [{
          title: "Opciones",
          rows: ops.slice(0, 10).map(o => ({ id: `gate:${o.id}`, title: o.label })),
        }],
      },
    },
  });
}

async function mandarALink(c: Creds, to: string, url: string, label: string) {
  await enviar(c, to, {
    type: "interactive",
    interactive: {
      type: "cta_url",
      body: { text: `Elegiste "${label}". Seguí por acá:` },
      action: { name: "cta_url", parameters: { display_text: "Abrir", url } },
    },
  });
}

// ── Un mensaje entrante ──────────────────────────────────────────────────────

async function procesar(phoneNumberId: string, msg: any) {
  const from = String(msg.from ?? "");
  const messageId = String(msg.id ?? "");
  if (!from || !messageId) return;

  // ¿Hay un gate activo para quien escribe, en ESTE teléfono? Si no, no es
  // asunto nuestro.
  // 1) El que eligió este teléfono de Meta de forma explícita.
  const campos = "id, user_id, prompt, success_text";
  let { data: gate } = await supabase
    .from("wa_gates").select(campos)
    .eq("recipient", from).eq("enabled", true)
    .eq("phone_number_id", phoneNumberId)
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();

  // 2) Sin teléfono elegido: vale para el WhatsApp conectado en el Vault, o
  //    sea el dueño de ese phone number id.
  if (!gate) {
    const { data: entradas } = await supabase
      .from("api_vault")
      .select("user_id")
      .eq("platform", "WhatsApp")
      .eq("name", "WHATSAPP_PHONE_NUMBER_ID")
      .eq("value", phoneNumberId);
    const userIds = [...new Set((entradas ?? []).map(e => e.user_id as string))];
    if (userIds.length === 0) return;
    ({ data: gate } = await supabase
      .from("wa_gates").select(campos)
      .in("user_id", userIds)
      .eq("recipient", from).eq("enabled", true)
      .is("phone_number_id", null)
      .order("updated_at", { ascending: false }).limit(1).maybeSingle());
  }
  if (!gate) return;

  // Idempotencia: Meta reintenta si tardamos en responder.
  const { error: dup } = await supabase.from("wa_gate_events").insert({ message_id: messageId });
  if (dup) return;

  const { data: tok } = await supabase
    .from("api_vault")
    .select("value")
    .eq("user_id", gate.user_id)
    .eq("platform", "WhatsApp")
    .eq("name", "WHATSAPP_ACCESS_TOKEN")
    .maybeSingle();
  if (!tok?.value) { console.error("[whatsapp-gate] sin WHATSAPP_ACCESS_TOKEN"); return; }
  const c: Creds = { token: tok.value, phoneNumberId };

  const { data: opsRaw } = await supabase
    .from("wa_gate_options")
    .select("id, position, label, is_correct, action_url, image_url")
    .eq("gate_id", gate.id)
    .order("position");
  const ops = (opsRaw ?? []) as Opcion[];

  // Un gate sin correcta o con menos de 2 opciones no es un gate: no se
  // responde nada antes que dejar a alguien en un callejón sin salida.
  if (ops.length < 2 || !ops.some(o => o.is_correct)) {
    console.error("[whatsapp-gate] gate mal configurado:", gate.id);
    return;
  }

  const { data: sesion } = await supabase
    .from("wa_gate_sessions")
    .select("state")
    .eq("gate_id", gate.id).eq("wa_id", from)
    .maybeSingle();

  const guardar = (state: string, chosen: string | null) =>
    supabase.from("wa_gate_sessions").upsert({
      gate_id: gate.id, wa_id: from, state, chosen_option: chosen,
      updated_at: new Date().toISOString(),
    });

  // ¿Es una respuesta a las opciones?
  const respuestaId: string | undefined =
    msg.interactive?.button_reply?.id ?? msg.interactive?.list_reply?.id;

  if (respuestaId?.startsWith("gate:")) {
    const elegida = ops.find(o => `gate:${o.id}` === respuestaId);
    if (!elegida) { await mostrarOpciones(c, from, gate.prompt, ops); return; }

    if (elegida.is_correct) {
      await guardar("passed", elegida.id);
      await texto(c, from, gate.success_text);
    } else {
      await guardar("redirected", elegida.id);
      if (elegida.action_url) await mandarALink(c, from, elegida.action_url, elegida.label);
      else await texto(c, from, "Esa no era la opción. Escribinos de nuevo para volver a intentar.");
    }
    return;
  }

  // Ya pasó: el chat sigue y este webhook no interviene.
  if (sesion?.state === "passed") return;

  // Primera vez, o todavía sin elegir, o eligió mal y vuelve a escribir.
  await guardar("pending", null);
  await mostrarOpciones(c, from, gate.prompt, ops);
}

// ── Entrada ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Verificación al registrar el webhook en Meta.
  if (req.method === "GET") {
    const u = new URL(req.url);
    const esperado = await claveDeServidor("WA_GATE_VERIFY_TOKEN");
    if (
      esperado &&
      u.searchParams.get("hub.mode") === "subscribe" &&
      u.searchParams.get("hub.verify_token") === esperado
    ) {
      return new Response(u.searchParams.get("hub.challenge") ?? "", { status: 200 });
    }
    return new Response("forbidden", { status: 403 });
  }

  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const raw = await req.text();
  if (!(await firmaValida(raw, req.headers.get("x-hub-signature-256")))) {
    return new Response("invalid signature", { status: 401 });
  }

  // Desde acá siempre 200: un 5xx hace que Meta reintente y duplique respuestas.
  try {
    const body = JSON.parse(raw);
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const v = change.value;
        const pnid = v?.metadata?.phone_number_id;
        if (!pnid) continue;
        for (const msg of v.messages ?? []) {
          try { await procesar(String(pnid), msg); }
          catch (e) { console.error("[whatsapp-gate] mensaje falló:", e); }
        }
      }
    }
  } catch (e) {
    console.error("[whatsapp-gate] payload inválido:", e);
  }
  return new Response("ok", { status: 200 });
});
