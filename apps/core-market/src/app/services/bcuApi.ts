/* =====================================================
   Tipo de cambio — se lee, no se consulta
   =====================================================

   Antes esto le pegaba al BCU desde el navegador y, si fallaba, devolvía
   42/44 hardcodeado sin avisar que era inventado. Dos problemas:

   - El TC de una factura no puede salir del cliente. Con cada visitante
     consultando al BCU por su cuenta, el número que termina en una orden
     depende de qué le contestó al navegador del comprador.
   - Un fallback hardcodeado es peor que no tener cotización: factura con un
     número inventado en vez de negarse.

   Ahora hay una sola cotización, la oficial del BCU, que escribe la Edge
   Function `tipo-de-cambio` en `exchange_rates`. Acá solo se lee, y si no hay,
   se dice que no hay.
   ===================================================== */

import { supabase } from "../../utils/supabase/client";

export interface TipoCambio {
  fecha: string;
  compra: number;
  venta: number;
  /** Cuán vieja es la cotización. El BCU no publica fines de semana ni
   *  feriados, así que "de ayer" es normal y no es un error: sirve para
   *  avisar, no para bloquear. */
  diasDeAntiguedad: number;
}

let cache: { data: TipoCambio; timestamp: number } | null = null;
const CACHE_TTL = 1000 * 60 * 30; // 30 minutos

/**
 * La cotización vigente, o `null` si no hay ninguna.
 *
 * `null` es un resultado, no un error a tapar: quien lo reciba tiene que
 * decidir qué mostrar. Lo que no puede hacer es inventar un número.
 */
export async function getTipoCambioUSD(): Promise<TipoCambio | null> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  const { data, error } = await supabase
    .rpc("tipo_cambio_vigente", { p_from: "USD", p_to: "UYU" })
    .maybeSingle();

  if (error) {
    console.warn("No se pudo leer el tipo de cambio:", error.message);
    return null;
  }
  if (!data) return null;

  const fila = data as { rate: number; compra: number | null; venta: number | null; valid_at: string };
  const venta = Number(fila.venta ?? fila.rate);

  const cotizacion: TipoCambio = {
    fecha: fila.valid_at,
    compra: Number(fila.compra ?? venta),
    venta,
    diasDeAntiguedad: Math.max(
      0,
      Math.floor((Date.now() - new Date(fila.valid_at).getTime()) / 86_400_000),
    ),
  };

  cache = { data: cotizacion, timestamp: Date.now() };
  return cotizacion;
}

/* Las conversiones usan `venta`: pasar de dólares a pesos se hace al dólar
   vendedor, que es lo mismo que factura el checkout. */
export function convertirUYUaUSD(monto: number, tipoCambio: TipoCambio): number {
  return Math.round((monto / tipoCambio.venta) * 100) / 100;
}

export function convertirUSDaUYU(monto: number, tipoCambio: TipoCambio): number {
  return Math.round(monto * tipoCambio.venta);
}

export function formatearPrecio(monto: number, moneda: "UYU" | "USD"): string {
  if (moneda === "USD") {
    return "U$S " + monto.toLocaleString("es-UY", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  return "$U " + Math.round(monto).toLocaleString("es-UY");
}
