/**
 * La forma plana de un articulo, y como se llega a ella desde catalog_*.
 *
 * POR QUE VIVE ACA Y NO EN UNA PANTALLA
 * Vivia dentro de Publicaciones, que era la unica que la usaba. Desde que la
 * Biblioteca abre el articulo -que es donde se acordo que se cargue y se
 * edite- hay dos pantallas que necesitan la misma conversion. Dejarla en una y
 * que la otra la importe haria que una pantalla dependa de otra; copiarla haria
 * que las dos digan lo mismo hasta que una cambie.
 */
import type { Publicacion } from "../hooks/useCatalogPublicaciones";

/** Igual que canalActivo pero sobre la forma plana que usa la tabla. */
export const canalActivoEn = (a:{canales?:any[]}, channel:string) =>
  (a.canales ?? []).some((c:any)=>c.channel===channel && c.status!=="delisted");

/** Un canal cuenta como activo salvo que se lo haya dado de baja. */
export const canalActivo = (p:Publicacion, channel:string) =>
  p.channels.some(c => c.channel === channel && c.status !== "delisted");

export interface Art {
  id:string; nombre:string; tipo:"market"|"secondhand"; status:string;
  precio:number; moneda:string; imagen_principal?:string; imagenes?:any[];
  videos?:any[]; stock:number; condicion?:string; departamento_id?:string;
  departamento_nombre?:string; categoria_id?:string; categoria_nombre?:string;
  atributos?:Record<string,any>; descripcion?:string;
  rating_promedio?:number; rating_count?:number;
  impresiones?:number; clicks?:number; ranking_score?:number;
  created_at:string; published_at?:string; deleted_at?:string;
  baja_prevista?:string; precio_original?:number; sku?:string;
  stock_ilimitado?:boolean; envio_tipo?:string; envio_gratis?:boolean;
  /* garantia/tipo_envio/peso/dimensiones/material/origen son columnas reales de
     catalog_producto_base. Antes habia aca `peso_kg`, `garantia_tipo` y
     `garantia_meses`, que no existen en ninguna tabla: el editor viejo los
     mostraba y se perdian al recargar. */
  garantia?:string|null; tipo_envio?:string|null; peso?:string|null;
  dimensiones?:string|null; material?:string|null; origen?:string|null;
  sync_ml?:boolean; sync_meta?:boolean; sync_wa?:boolean; sync_web?:boolean;
  // Añadidos por la migración a catalog_*: `id` es el variant_id, y estos dos
  // conservan lo que la forma plana de Art no puede representar.
  item_id?:string; canales?:Publicacion["channels"];
  /* La ficha de Biblioteca de la que sale. Es por donde se llega al editor:
     el articulo se carga y se edita alla, que es la fuente. */
  ficha_id?:string|null;
  // Lo que sabemos del producto, guardado. Ver la migracion 001900.
  ficha?:Record<string,any>|null; fichaFuente?:string|null; fichaAt?:string|null;
  sync_market?:boolean; sync_second?:boolean;
}

/**
 * catalog_* -> la forma que la tabla ya sabe dibujar.
 *
 * `tipo` deja de ser una columna y pasa a ser lo que siempre debió ser: la
 * presencia de un listing en el canal 'market' o 'secondhand'.
 */
export function toArt(p:Publicacion):Art {
  return {
    id:          p.variant_id,
    item_id:     p.item_id,
    ficha_id:    p.ficha_id ?? null,
    nombre:      p.title,
    descripcion: p.description ?? undefined,
    sku:         p.sku ?? undefined,
    // Un articulo es de Market o de Second Hand; cualquier otra cosa que
    // devuelva la base se trata como Market, que es el caso normal.
    tipo:        p.tipo === "secondhand" ? "secondhand" : "market",
    status:      p.item_status,
    precio:      p.master_price ?? 0,
    moneda:      p.master_currency,
    stock:       p.total_available,
    created_at:  p.created_at,
    published_at:p.item_status === "active" ? p.updated_at : undefined,
    canales:     p.channels,
    ficha:       (p as any).ficha ?? null,
    fichaFuente: (p as any).ficha_fuente ?? null,
    fichaAt:     (p as any).ficha_at ?? null,
    garantia:    (p as any).garantia    ?? null,
    tipo_envio:  (p as any).tipo_envio  ?? null,
    peso:        (p as any).peso        ?? null,
    dimensiones: (p as any).dimensiones ?? null,
    material:    (p as any).material    ?? null,
    origen:      (p as any).origen      ?? null,
    sync_market: p.tipo === "market",
    sync_second: p.tipo === "secondhand",
    sync_ml:     canalActivo(p,"mercadolibre"),
    sync_meta:   canalActivo(p,"meta"),
    sync_wa:     canalActivo(p,"whatsapp"),
    sync_web:    canalActivo(p,"web"),
  };
}
