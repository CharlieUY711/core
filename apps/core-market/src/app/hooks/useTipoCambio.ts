import { useState, useEffect } from "react";
import { getTipoCambioUSD, type TipoCambio } from "../services/bcuApi";

/**
 * La cotizacion oficial vigente.
 *
 * `tipoCambio` en null con `loading` en false significa que no hay ninguna
 * cotizacion cargada -no que la consulta falle-. Quien use el hook tiene que
 * decidir que mostrar en ese caso; lo que no puede hacer es inventar un
 * numero, que es lo que hacia el fallback 42/44 que habia antes.
 */
export function useTipoCambio() {
  const [tipoCambio, setTipoCambio] = useState<TipoCambio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTipoCambioUSD()
      .then(setTipoCambio)
      .finally(() => setLoading(false));
  }, []);

  return { tipoCambio, loading };
}
