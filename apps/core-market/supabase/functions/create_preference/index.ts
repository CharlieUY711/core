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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: corsHeaders });

    const { order_id } = await req.json();
    if (!order_id) return new Response(JSON.stringify({ error: "order_id requerido" }), { status: 400, headers: corsHeaders });

    const { data: orden, error: ordenError } = await supabase
      .from("ordenes")
      .select("*")
      .eq("id", order_id)
      .eq("user_id", user.id)
      .eq("estado", "pendiente")
      .single();

    if (ordenError || !orden) return new Response(JSON.stringify({ error: "Orden no encontrada o no disponible" }), { status: 404, headers: corsHeaders });

    const mpToken = Deno.env.get("MP_ACCESS_TOKEN")!;
    const total = orden.moneda === "USD" ? Number(orden.total_usd) : Number(orden.total_uyu);

    const preference = {
      items: [{
        title: "Compra Oddy Market",
        quantity: 1,
        unit_price: total,
        currency_id: orden.moneda === "USD" ? "USD" : "UYU",
      }],
      external_reference: order_id,
      back_urls: {
        success: "https://oddyfront.core.com.uy/success",
        failure: "https://oddyfront.core.com.uy/failure",
        pending: "https://oddyfront.core.com.uy/pending",
      },
      auto_return: "approved",
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp_webhook`,
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mpToken}`,
      },
      body: JSON.stringify(preference),
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) throw new Error(mpData.message || "Error creando preferencia en MercadoPago");

    await supabase
      .from("ordenes")
      .update({ mp_preference_id: mpData.id })
      .eq("id", order_id);

    return new Response(JSON.stringify({ init_point: mpData.init_point, preference_id: mpData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Error interno" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});




