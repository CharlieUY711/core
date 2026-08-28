import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../utils/supabase/client";

/**
 * Publicaciones sobre el modelo multicanal (catalog_*).
 *
 * Una sola llamada RPC devuelve una fila por producto con sus canales
 * agregados y el precio ya resuelto por canal — sin N+1.
 *
 * El aislamiento por tienda NO se hace acá: lo aplica RLS a partir del claim
 * `store_id` del JWT. Si el hook de access token no está habilitado, esto
 * devuelve cero filas, y eso es lo correcto.
 */

/** Valores reales del enum catalog_listing_status. */
export type ListingStatus =
  | "pending"
  | "syncing"
  | "active"
  | "paused"
  | "error"
  | "delisted";

/** De dónde salió el precio de un canal (§18). */
export type PriceOrigin = "MASTER" | "OVERRIDE" | "NONE";

export interface CanalPublicacion {
  channel: string;
  status: ListingStatus;
  external_id: string | null;
  last_error: string | null;
  synced_at: string | null;
  channel_attrs: Record<string, unknown> | null;
  price: number | null;
  price_origin: PriceOrigin;
}

export interface Publicacion {
  variant_id: string;
  item_id: string;
  sku: string | null;
  title: string;
  description: string | null;
  item_status: "draft" | "active" | "archived" | "discontinued";
  variant_status: "active" | "inactive" | "discontinued";
  tags: string[] | null;
  total_available: number;
  master_price: number | null;
  master_currency: string;
  channels: CanalPublicacion[];
  /**
   * Ficha ampliada guardada en el item: lo que sabemos del producto.
   *
   * Se guarda y no se arma cada vez porque viene de APIs ajenas: si se
   * reconstruyera en cada visita, un canal caido dejaria al articulo sin
   * informacion.
   */
  ficha: Record<string, any> | null;
  ficha_fuente: string | null;
  ficha_at: string | null;
  /* Detalles del producto. Viven en `catalog_producto_base` y hasta ahora
     ninguna consulta los traia: el formulario los mostraba vacios aunque la
     base tuviera datos. */
  garantia: string | null;
  tipo_envio: string | null;
  peso: string | null;
  dimensiones: string | null;
  material: string | null;
  origen: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Carga imperativa, para pantallas que ya manejan su propio `reload()` y no
 * pueden colgarse de un useEffect. El hook de abajo la reutiliza para que la
 * query viva en un solo lugar.
 */
export async function fetchPublicaciones(currency = "UYU"): Promise<Publicacion[]> {
  const { data, error } = await supabase.rpc("catalog_publicaciones", {
    p_currency: currency,
  });
  if (error) throw new Error(error.message);
  return (data as Publicacion[]) ?? [];
}

export function useCatalogPublicaciones(currency = "UYU") {
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setPublicaciones(await fetchPublicaciones(currency));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }

    setLoading(false);
  }, [currency]);

  useEffect(() => { refetch(); }, [refetch]);

  return { publicaciones, loading, error, refetch };
}

/**
 * Contadores para las tarjetas de la cabecera (Total / Activos / Borradores).
 * Se derivan en memoria: la lista ya está cargada, una segunda query sería
 * gasto puro.
 */
export function resumirPublicaciones(publicaciones: Publicacion[]) {
  return {
    total:      publicaciones.length,
    activos:    publicaciones.filter(p => p.item_status === "active").length,
    borradores: publicaciones.filter(p => p.item_status === "draft").length,
    conError:   publicaciones.filter(p => p.channels.some(c => c.status === "error")).length,
    sinCanales: publicaciones.filter(p => p.channels.length === 0).length,
  };
}
