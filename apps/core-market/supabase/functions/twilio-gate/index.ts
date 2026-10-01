// =============================================================================
// supabase/functions/twilio-gate/index.ts
//
// Webhook de Twilio (WhatsApp) para el "gate" de Configuraciones y usos.
// Misma lógica que whatsapp-gate (Meta), con Twilio como canal:
//   1. El destinatario configurado escribe al número de Twilio.
//   2. Si todavía no pasó, recibe el menú (texto numerado; las opciones con
//      imagen salen como un mensaje con la imagen).
//   3. Responde con el número o el texto de la opción.
//        - la correcta: queda habilitado y se le manda el texto de éxito;
//        - otra: recibe su URL y, a los `menu_return_seconds`, el menú otra vez.
//   4. Cualquier otro número, o una configuración apagada, se ignora.
//
// Sin variables de entorno de Twilio: TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN se
// leen del API Vault (plataforma "Twilio", "Sólo servidor") del dueño de la
// configuración. Se usan botones de texto y no plantillas interactivas porque
// éstas exigen aprobar plantillas en Twilio.
//
// Desplegar sin verificación de JWT (Twilio no manda uno); la firma
// X-Twilio-Signature es la que autentica:
//   supabase functions deploy twilio-gate --no-verify-jwt
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// URL pública con la que Twilio calcula la firma (detrás del proxy de Supabase
// req.url no es la misma, por eso no se usa).
const URL_PUBLICA = `${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-gate`;

const digitos = (s: string) => s.replace(/\D/g, "");
const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const espera = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Vault ────────────────────────────────────────────────────────────────────

async function credencial(userId: string, nombre: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("api_vault").select("value")
    .eq("user_id", userId).eq("platform", "Twilio").eq("name", nombre)
    .limit(1).maybeSingle();
  if (error) console.error(`[twilio-gate] no se pudo leer ${nombre}:`, error.message);
  return data?.value?.trim() || null;
}

// ── Firma de Twilio: base64(HMAC-SHA1(token, url + params ordenados)) ────────

async function firmaValida(token: string, params: Record<string, string>, header: string | null) {
  if (!header) return false;
  const base = URL_PUBLICA + Object.keys(params).sort().map(k => k + params[k]).join("");
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(token), { name: "HMAC", hash: "SHA-1" }, false, ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(base)));
  let bin = ""; for (const b of mac) bin += String.fromCharCode(b);
  const esperada = btoa(bin);
  if (esperada.length !== header.length) return false;
  let diff = 0;
  for (let i = 0; i < esperada.length; i++) diff |= esperada.charCodeAt(i) ^ header.charCodeAt(i);
  return diff === 0;
}

// ── Envío ────────────────────────────────────────────────────────────────────

type Canal = { sid: string; token: string; from: string };

async function enviar(c: Canal, to: string, body: string, media?: string | null) {
  const form = new URLSearchParams({ From: `whatsapp:+${c.from}`, To: `whatsapp:+${to}`, Body: body });
  if (media) form.set("MediaUrl", media);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${c.sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${c.sid}:${c.token}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  if (!res.ok) console.error("[twilio-gate] envío falló:", res.status, await res.text());
}

type Opcion = {
  id: string; position: number; label: string;
  is_correct: boolean; action_url: string | null; image_url: string | null;
};

async function mostrarOpciones(c: Canal, to: string, prompt: string, ops: Opcion[]) {
  const pie = "Respondé con el número de la opción.";
  if (ops.some(o => o.image_url)) {
    await enviar(c, to, prompt);
    for (let i = 0; i < ops.length; i++) {
      await enviar(c, to, `${i + 1}) ${ops[i].label}`, ops[i].image_url);
    }
    await enviar(c, to, pie);
    return;
  }
  await enviar(c, to, `${prompt}\n\n${ops.map((o, i) => `${i + 1}) ${o.label}`).join("\n")}\n\n${pie}`);
}

function elegida(texto: string, ops: Opcion[]): Opcion | null {
  const t = normalizar(texto);
  if (/^\d{1,2}$/.test(t)) return ops[Number(t) - 1] ?? null;
  return ops.find(o => normalizar(o.label) === t) ?? null;
}

// ── Un mensaje entrante ──────────────────────────────────────────────────────

const vacio = () => new Response("<Response/>", { status: 200, headers: { "Content-Type": "text/xml" } });

async function procesar(req: Request): Promise<Response> {
  const raw = await req.text();
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(raw)) params[k] = v;

  const from = digitos(params.From ?? "");
  const to = digitos(params.To ?? "");
  const messageId = params.MessageSid ?? "";
  if (!from || !to || !messageId) return vacio();

  const { data: gate } = await supabase
    .from("wa_gates")
    .select("id, user_id, prompt, success_text, menu_return_seconds")
    .eq("provider", "twilio").eq("enabled", true)
    .eq("recipient", from).eq("twilio_from", to)
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (!gate) return vacio();   // nadie lo configuró: no es asunto nuestro

  const sid = await credencial(gate.user_id, "TWILIO_ACCOUNT_SID");
  const token = await credencial(gate.user_id, "TWILIO_AUTH_TOKEN");
  if (!sid || !token) { console.error("[twilio-gate] faltan credenciales de Twilio en el Vault"); return vacio(); }

  if (!(await firmaValida(token, params, req.headers.get("x-twilio-signature")))) {
    return new Response("invalid signature", { status: 403 });
  }

  // Idempotencia: Twilio puede reintentar.
  const { error: dup } = await supabase.from("wa_gate_events").insert({ message_id: messageId });
  if (dup) return vacio();

  const c: Canal = { sid, token, from: to };

  const { data: opsRaw } = await supabase
    .from("wa_gate_options")
    .select("id, position, label, is_correct, action_url, image_url")
    .eq("gate_id", gate.id).order("position");
  const ops = (opsRaw ?? []) as Opcion[];
  if (ops.length < 2 || !ops.some(o => o.is_correct)) {
    console.error("[twilio-gate] gate mal configurado:", gate.id);
    return vacio();
  }

  const { data: sesion } = await supabase
    .from("wa_gate_sessions").select("state")
    .eq("gate_id", gate.id).eq("wa_id", from).maybeSingle();

  const guardar = (state: string, chosen: string | null) =>
    supabase.from("wa_gate_sessions").upsert({
      gate_id: gate.id, wa_id: from, state, chosen_option: chosen,
      updated_at: new Date().toISOString(),
    });

  // Ya pasó: el chat sigue y esto no interviene.
  if (sesion?.state === "passed") return vacio();

  const op = sesion?.state === "pending" || sesion?.state === "redirected"
    ? elegida(params.Body ?? "", ops) : null;

  if (!op) {
    await guardar("pending", null);
    await mostrarOpciones(c, from, gate.prompt, ops);
    return vacio();
  }

  if (op.is_correct) {
    await guardar("passed", op.id);
    await enviar(c, from, gate.success_text);
    return vacio();
  }

  await guardar("redirected", op.id);
  await enviar(c, from, op.action_url ? `Elegiste "${op.label}". Seguí por acá:\n${op.action_url}`
    : "Esa no era la opción.", op.image_url);

  // Vuelta al menú a los N segundos, si no pasó nada en el medio.
  const seg = Number(gate.menu_return_seconds ?? 0);
  if (seg > 0) {
    const tarea = (async () => {
      await espera(seg * 1000);
      const { data: s } = await supabase
        .from("wa_gate_sessions").select("state, chosen_option")
        .eq("gate_id", gate.id).eq("wa_id", from).maybeSingle();
      if (s?.state !== "redirected" || s.chosen_option !== op.id) return;
      await guardar("pending", null);
      await mostrarOpciones(c, from, gate.prompt, ops);
    })().catch(e => console.error("[twilio-gate] vuelta al menú falló:", e));
    // deno-lint-ignore no-explicit-any
    const rt = (globalThis as any).EdgeRuntime;
    if (rt?.waitUntil) rt.waitUntil(tarea); else await tarea;
  }
  return vacio();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  try {
    return await procesar(req);
  } catch (e) {
    console.error("[twilio-gate] falló:", e);
    return vacio();   // 200: no queremos reintentos que dupliquen respuestas
  }
});
