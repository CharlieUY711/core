// invitar-persona — sumar a alguien a un vendedor, tenga cuenta o no.
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUÉ EXISTE
// ═══════════════════════════════════════════════════════════════════════════
//
// `agregar_miembro` exige que la persona YA tenga cuenta, y con razón: sumar por
// correo a quien no existe crearía un miembro que nunca va a poder entrar.
//
// Pero eso dejaba la mitad del trabajo afuera. Para sumar a alguien nuevo había
// que pedirle que se registrara solo, esperar a que lo hiciera, y recién
// entonces agregarlo — con el agravante de que quien invita no se entera de si
// el otro llegó a hacerlo.
//
// Crear una cuenta no se puede desde SQL: `auth.users` sólo se escribe con la
// llave de servicio. Por eso esto es una función y no una RPC.
//
// ═══════════════════════════════════════════════════════════════════════════
// UNA SOLA PUERTA
// ═══════════════════════════════════════════════════════════════════════════
//
// Quien llama no tiene que averiguar antes si la persona existe: manda el
// correo y acá se resuelve. Con dos caminos en la pantalla —"agregar" e
// "invitar"— habría que elegir uno antes de saber cuál corresponde, y elegir
// mal devuelve un error que no explica nada.
//
// EL PERMISO LO DECIDE LA BASE, NO ESTA FUNCIÓN
// Se pregunta con la sesión de quien llama: `puede_administrar_miembros` es la
// misma regla que aplican `agregar_miembro`, `cambiar_rol_miembro` y
// `sacar_miembro`. Escribir la regla otra vez acá sería el segundo lugar donde
// se decide lo mismo, y el que se olvida siempre es el segundo.
//
// La llave de servicio se usa DESPUÉS de esa respuesta y sólo para lo que no se
// puede de otra forma: crear la cuenta y anotar la membresía de una cuenta
// recién creada.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROLES = ["duenio", "administrador", "operador"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado." }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const deQuienLlama = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: eUser } = await deQuienLlama.auth.getUser();
    if (eUser || !user) return json({ error: "Sesión no válida." }, 401);

    const body = await req.json().catch(() => ({}));
    const correo = String(body.correo ?? "").trim().toLowerCase();
    const storeId = String(body.store_id ?? "").trim();
    const rol = String(body.rol ?? "operador").trim();

    if (!correo || !correo.includes("@")) {
      return json({ error: "Escribí un correo válido." }, 400);
    }
    if (!storeId) return json({ error: "Falta el vendedor." }, 400);
    if (!ROLES.includes(rol)) return json({ error: `Rol desconocido: ${rol}` }, 400);

    // El permiso, con la sesión de quien llama y con la MISMA regla que el
    // resto. Antes de cualquier otra cosa.
    const { data: puede, error: ePermiso } = await deQuienLlama
      .rpc("puede_administrar_miembros", { p_store_id: storeId });
    if (ePermiso) return json({ error: ePermiso.message }, 400);
    if (!puede) {
      return json({ error: "Sólo el dueño de este vendedor suma personas." }, 403);
    }

    // ── Ya tiene cuenta: es el camino de siempre ─────────────────────────
    const { error: eAgregar } = await deQuienLlama.rpc("agregar_miembro", {
      p_store_id: storeId, p_correo: correo, p_rol: rol,
    });
    if (!eAgregar) {
      return json({ invitada: false, correo, mensaje: `${correo} ya puede entrar.` });
    }

    // Cualquier otro problema es problema: no se invita a alguien porque el
    // servidor dijo otra cosa.
    if (!/no hay ninguna cuenta/i.test(eAgregar.message)) {
      return json({ error: eAgregar.message }, 400);
    }

    // ── No tiene cuenta: se la invita ────────────────────────────────────
    const servicio = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    const destino = String(body.volver_a ?? "").trim();
    const { data: invitada, error: eInvitar } = await servicio.auth.admin
      .inviteUserByEmail(correo, destino ? { redirectTo: destino } : undefined);

    if (eInvitar || !invitada?.user) {
      return json({
        error: `No se pudo invitar a ${correo}: ${eInvitar?.message ?? "sin detalle"}`,
      }, 400);
    }

    // Y la membresía. Se anota acá y no se espera a que acepte: si dependiera
    // de que alguien vuelva a agregarla después de que acepte, la invitación
    // llegaría a una cuenta sin vendedor —entra, ve el panel vacío, y no hay
    // nada que se lo explique—.
    const { error: eMiembro } = await servicio.from("store_members").insert({
      store_id: storeId, user_id: invitada.user.id, rol, is_default: true,
    });

    if (eMiembro) {
      // La cuenta quedó creada y sin vendedor. Se dice: la persona va a recibir
      // el correo igual, y quien invitó tiene que saber que falta la mitad.
      return json({
        error: `Se envió la invitación a ${correo}, pero no se pudo anotar en el `
             + `vendedor: ${eMiembro.message}. Agregala de nuevo cuando acepte.`,
      }, 400);
    }

    return json({
      invitada: true, correo,
      mensaje: `Invitación enviada a ${correo}. Va a poder entrar cuando la acepte.`,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
