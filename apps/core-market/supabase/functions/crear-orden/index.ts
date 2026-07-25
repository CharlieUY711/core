import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: corsHeaders });

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: corsHeaders });

    const body = await req.json();
    const {
      items,
      nombre,
      email,
      telefono,
      direccion,
      ciudad,
      codigo_postal,
      tipo_comprador,
      documento,
      razon_social,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "items requeridos" }), { status: 400, headers: corsHeaders });
    }
    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity <= 0) {
        return new Response(JSON.stringify({ error: "item invalido" }), { status: 400, headers: corsHeaders });
      }
    }
    if (!nombre || !email) {
      return new Response(JSON.stringify({ error: "nombre y email requeridos" }), { status: 400, headers: corsHeaders });
    }
    if (tipo_comprador === "empresa") {
      if (!razon_social || !documento || !/^\d{12}$/.test(documento)) {
        return new Response(JSON.stringify({ error: "razon_social y RUT (12 digitos) requeridos para empresa" }), { status: 400, headers: corsHeaders });
      }
    }

    // ?origen=instagram en el link de IG llega hasta acá como query param
    // del propio request, o se puede mandar explícito en el body.
    const url = new URL(req.url);
    const source = body.origen || url.searchParams.get("origen") || "web";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase.rpc("crear_orden_segura", {
      p_user_id: user.id,
      p_items: items.map((i: any) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        tipo: i.tipo || "market",
      })),
      p_nombre: nombre,
      p_email: email,
      p_telefono: telefono ?? null,
      p_direccion: direccion ?? null,
      p_ciudad: ciudad ?? null,
      p_codigo_postal: codigo_postal ?? null,
      p_tipo_comprador: tipo_comprador || "persona",
      p_documento: documento ?? null,
      p_razon_social: razon_social ?? null,
      p_source: source,
    });

    if (error) {
      console.error("RPC error:", error);
      const msg = error.message?.includes("Stock insuficiente")
        ? "Stock insuficiente para uno o más productos"
        : error.message?.includes("no encontrado")
        ? "Uno o más productos no están disponibles"
        : error.message?.includes("pausado")
        ? "Uno o más productos están pausados"
        : error.message?.includes("RUT")
        ? "El RUT ingresado no es válido"
        : "Error procesando la orden";
      return new Response(JSON.stringify({ error: msg }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ order_id: data.order_id, total: data.total }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
