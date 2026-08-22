import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../../utils/supabase/client";

export default function OrdenPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [polling, setPolling] = useState(false);

  const status = searchParams.get("status");

  useEffect(() => {
    async function cargarOrden() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError("No autenticado"); setLoading(false); return; }

        const { data, error: dbError } = await supabase
          .from("ordenes")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (dbError || !data) { setError("Orden no encontrada"); setLoading(false); return; }
        setOrden(data);

        // Si viene de MP con status=success pero orden aun pendiente, hacer polling
        if (status === "success" && data.estado !== "pagado") {
          setPolling(true);
        }
      } catch (err) {
        setError("Error cargando la orden");
      } finally {
        setLoading(false);
      }
    }
    cargarOrden();
  }, [id]);

  // Polling cada 3 segundos si el pago fue aprobado pero el webhook aun no llegó
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from("ordenes").select("estado").eq("id", id).single();
      if (data?.estado === "pagado") {
        setOrden(prev => ({ ...prev, estado: "pagado" }));
        setPolling(false);
      }
    }, 3000);
    const timeout = setTimeout(() => { setPolling(false); }, 30000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [polling, id]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", color: "#666" }}>
      Cargando orden...
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
      <div style={{ fontSize: "3rem" }}>❌</div>
      <h2 style={{ color: "#dc2626" }}>{error}</h2>
      <Link to="/" style={{ color: "#FF6835", textDecoration: "none", fontWeight: 600 }}>← Volver a la tienda</Link>
    </div>
  );

  const isPaid = orden.estado === "pagado";
  const isPending = orden.estado === "pendiente";
  const total = orden.moneda === "USD" ? orden.total_usd : orden.total_uyu;
  const simbolo = orden.moneda === "USD" ? "U$S" : "$U";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FAFAFA", fontFamily: "DM Sans, sans-serif" }}>
      <header style={{ background: isPaid ? "color-mix(in srgb, var(--color-success) 70%, white)" : "#FF6835", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "background 0.5s" }}>
        <Link to="/" style={{ textDecoration: "none", color: "#fff", fontWeight: 600 }}>← Volver</Link>
        <h1 style={{ margin: 0, color: "#fff", fontSize: "1.25rem", fontWeight: 700 }}>
          {isPaid ? "✅ Pago confirmado" : polling ? "⏳ Procesando pago..." : "📋 Orden"}
        </h1>
        <div style={{ width: 80 }} />
      </header>

      <div style={{ maxWidth: "680px", margin: "2rem auto", padding: "0 1rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Estado */}
        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>
            {isPaid ? "🎉" : polling ? "⏳" : "🕐"}
          </div>
          <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.5rem", color: isPaid ? "#166534" : "#92400e" }}>
            {isPaid ? "Pago confirmado" : polling ? "Confirmando pago..." : "Pago pendiente"}
          </h2>
          <p style={{ margin: 0, color: "#888", fontSize: "0.9rem" }}>
            Orden #{id?.substring(0, 8).toUpperCase()}
          </p>
          {polling && (
            <p style={{ margin: "0.5rem 0 0 0", color: "#888", fontSize: "0.85rem" }}>
              Estamos esperando la confirmación de MercadoPago...
            </p>
          )}
        </div>

        {/* Total */}
        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: 700, color: "#444" }}>Resumen</h3>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#666" }}>Total</span>
            <span style={{ fontSize: "1.5rem", fontWeight: 800, color: isPaid ? "color-mix(in srgb, var(--color-success) 70%, white)" : "#FF6835" }}>
              {simbolo} {Number(total).toLocaleString("es-UY")}
            </span>
          </div>
          {orden.tipo_cambio && orden.moneda === "USD" && (
            <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.8rem", color: "#aaa" }}>
              Tipo de cambio: $U {orden.tipo_cambio}
            </p>
          )}
        </div>

        {/* Items */}
        {orden.items && orden.items.length > 0 && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: 700, color: "#444" }}>Productos</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {orden.items.map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: "#FAFAFA", borderRadius: "8px" }}>
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "#444" }}>
                      {item.producto_tipo === "market" ? "🛍" : "♻️"} #{item.producto_id?.substring(0, 8)}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#888" }}>Cantidad: {item.cantidad}</div>
                  </div>
                  <div style={{ fontWeight: 600, color: "#222" }}>
                    {simbolo} {Number(item.precio_unitario * item.cantidad).toLocaleString("es-UY")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Datos del cliente */}
        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: 700, color: "#444" }}>Datos de entrega</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.9rem", color: "#666" }}>
            {orden.nombre_cliente && <div><strong>Nombre:</strong> {orden.nombre_cliente}</div>}
            {orden.email_cliente && <div><strong>Email:</strong> {orden.email_cliente}</div>}
            {orden.telefono_cliente && <div><strong>Teléfono:</strong> {orden.telefono_cliente}</div>}
            {orden.direccion_entrega && <div><strong>Dirección:</strong> {orden.direccion_entrega}</div>}
          </div>
        </div>

        <Link to="/" style={{ display: "block", textAlign: "center", padding: "1rem", background: isPaid ? "color-mix(in srgb, var(--color-success) 70%, white)" : "#FF6835", color: "#fff", textDecoration: "none", borderRadius: "8px", fontWeight: 700, fontSize: "1rem" }}>
          {isPaid ? "Seguir comprando" : "Volver a la tienda"}
        </Link>
      </div>
    </div>
  );
}



