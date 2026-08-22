import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    if (req.method === "GET") return new Response("ok", { status: 200 });

    const body = await req.json().catch(() => ({}));

    if (body.type !== "payment") return new Response("ok", { status: 200 });

    const paymentId = body?.data?.id;
    if (!paymentId) return new Response("ok", { status: 200 });

    const mpToken = Deno.env.get("MP_ACCESS_TOKEN")!;

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { "Authorization": `Bearer ${mpToken}` },
    });

    if (!mpRes.ok) return new Response("ok", { status: 200 });

    const payment = await mpRes.json();

    if (payment.status !== "approved") return new Response("ok", { status: 200 });

    const orderId = payment.external_reference;
    if (!orderId) return new Response("ok", { status: 200 });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Confirmacion por el camino canonico, el mismo que usa paypal-webhook.
    // confirmar_pago es idempotente por payment_id, bloquea la orden, valida
    // la transicion pending_payment -> paid y escribe payment_status y estado
    // a la vez. El update directo que habia aca solo escribia `estado`, que es
    // la columna que el admin NO lee.
    const { data: conf, error: confError } = await supabase.rpc("confirmar_pago", {
      p_order_id:   orderId,
      p_payment_id: String(paymentId),
      p_payload:    { provider: "mercadopago", payment_id: String(paymentId) },
    });

    if (confError) {
      console.error("confirmar_pago:", confError.message);
      // 200 igual: MercadoPago reintenta ante error, y la idempotencia de
      // confirmar_pago ya cubre el reintento legitimo.
      return new Response("ok", { status: 200 });
    }

    console.log("confirmar_pago ok:", JSON.stringify(conf));

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("ok", { status: 200 });
  }
});




