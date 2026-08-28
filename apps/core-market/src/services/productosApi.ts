import { supabase } from '../../utils/supabase/client';

/**
 * Vidriera pública sobre catalog_* (migración Base/Variante, ver DEC-012 y
 * .agent/TASK.md — "Catalog Master (Base/Variante) migration").
 *
 * `productos_market` / `productos_secondhand` ya no existen: el storefront
 * anónimo pasa por `catalog_vidriera`, la única puerta abierta a un visitante
 * sin `store_id` en el JWT (ver 20260822000600_catalog_vidriera_publica.sql y
 * 20260822000700_vidriera_por_ids.sql). `tipo` distingue "market" de
 * "secondhand" en la fila devuelta.
 *
 * OJO — pendiente de confirmar contra la base real: las migraciones
 * 20260825* (Catalog Master) corrieron directo en Supabase y no están en este
 * repo, así que no hay forma de verificar acá si `catalog_vidriera` ya se
 * actualizó para leer `catalog_producto_base` en vez de `catalog_items` /
 * `catalog_variants` / `catalog_listings`, ni si "tipo" sigue viniendo de un
 * canal falso 'market'/'secondhand' (el modelo viejo que DEC-012 dejó atrás)
 * o ya del atributo real. Si esta función devuelve error o vacío, ese es el
 * primer lugar a mirar.
 */

interface VidrieraRow {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: 'market' | 'secondhand';
  precio: number;
  precio_original: number | null;
  moneda: string;
  imagen_principal: string | null;
  imagenes: Array<{ url: string; orden: number }> | null;
  videos: Array<{ url: string; orden: number }> | null;
  departamento_nombre: string | null;
  condicion: string | null;
  stock: number;
  published_at: string | null;
}

export interface ProductoMarket {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  precio_original?: number;
  departamento_id?: string;
  departamento_nombre?: string;
  imagen_principal: string;
  imagenes?: string[];
  videos?: string[];
  vendedor_id?: string;
  rating?: number;
  rating_count?: number;
  visitas?: number;
  estado?: 'activo' | 'inactivo' | 'vendido' | 'agotado';
  badge?: string;
  badge_color?: string;
  published_date?: string;
  created_at?: string;
  updated_at?: string;
  departamento?: {
    id: string;
    nombre: string;
    color: string;
  };
  vendedor?: {
    id: string;
    nombre: string;
    rating_promedio?: number;
    total_ratings?: number;
  };
}

export interface ProductoSecondHand {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  precio_original?: number;
  departamento_id?: string;
  departamento_nombre?: string;
  imagen_principal: string;
  imagenes?: string[];
  videos?: string[];
  vendedor_id?: string;
  rating?: number;
  rating_count?: number;
  visitas?: number;
  estado?: 'activo' | 'inactivo' | 'vendido' | 'agotado';
  condicion?: string;
  published_date?: string;
  created_at?: string;
  updated_at?: string;
  departamento?: {
    id: string;
    nombre: string;
    color: string;
  };
  vendedor?: {
    id: string;
    nombre: string;
    rating_promedio?: number;
    total_ratings?: number;
  };
}

export interface ProductosFilters {
  departamento_id?: string;
  vendedor_id?: string;
  estado?: string;
  search?: string;
  limit?: number;
  offset?: number;
  order_by?: string;
  order_dir?: 'asc' | 'desc';
}

/**
 * `catalog_vidriera` no acepta filtros por departamento/búsqueda/orden: sólo
 * `p_currency`, `p_limit` y `p_ids`. Se traen las filas activas y el resto de
 * `ProductosFilters` se aplica acá en memoria. Si el volumen crece esto va a
 * necesitar mover el filtro al RPC (parámetros nuevos), no acá.
 */
async function fetchVidriera(filters?: ProductosFilters): Promise<VidrieraRow[]> {
  const { data, error } = await supabase.rpc('catalog_vidriera', {
    p_currency: 'UYU',
    p_limit: 500,
  });
  if (error) throw new Error(error.message);

  let rows: VidrieraRow[] = data || [];

  if (filters?.departamento_id) {
    // catalog_vidriera no devuelve departamento_id, sólo el nombre. No hay
    // forma de filtrar por id sin ese dato en la fila; se ignora el filtro
    // en vez de fallar en silencio con un resultado vacío engañoso.
    console.warn('[productosApi] filtro por departamento_id no soportado por catalog_vidriera; ignorado');
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter(r =>
      r.nombre?.toLowerCase().includes(q) || r.descripcion?.toLowerCase().includes(q));
  }

  const orderBy = filters?.order_by || 'published_at';
  const orderDir = filters?.order_dir || 'desc';
  const key = orderBy === 'created_at' ? 'published_at' : orderBy;
  rows = [...rows].sort((a: any, b: any) => {
    const va = a[key], vb = b[key];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    return orderDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });

  const offset = filters?.offset || 0;
  const limit = filters?.limit;
  return limit ? rows.slice(offset, offset + limit) : rows.slice(offset);
}

function toProductoMarket(r: VidrieraRow): ProductoMarket {
  return {
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion ?? undefined,
    precio: Number(r.precio),
    precio_original: r.precio_original != null ? Number(r.precio_original) : undefined,
    departamento_nombre: r.departamento_nombre ?? undefined,
    imagen_principal: r.imagen_principal || (r.imagenes?.[0]?.url ?? ''),
    imagenes: (r.imagenes ?? []).map(i => i.url),
    videos: (r.videos ?? []).map(v => v.url),
    estado: 'activo',
    published_date: r.published_at ?? undefined,
  };
}

function toProductoSecondHand(r: VidrieraRow): ProductoSecondHand {
  return {
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion ?? undefined,
    precio: Number(r.precio),
    precio_original: r.precio_original != null ? Number(r.precio_original) : undefined,
    departamento_nombre: r.departamento_nombre ?? undefined,
    imagen_principal: r.imagen_principal || (r.imagenes?.[0]?.url ?? ''),
    imagenes: (r.imagenes ?? []).map(i => i.url),
    videos: (r.videos ?? []).map(v => v.url),
    estado: 'activo',
    condicion: r.condicion ?? undefined,
    published_date: r.published_at ?? undefined,
  };
}

export async function fetchProductosMarket(filters?: ProductosFilters): Promise<ProductoMarket[]> {
  const rows = await fetchVidriera(filters);
  return rows.filter(r => r.tipo === 'market').map(toProductoMarket);
}

export async function fetchProductoMarketById(id: string): Promise<ProductoMarket | null> {
  const { data, error } = await supabase.rpc('catalog_vidriera', {
    p_currency: 'UYU',
    p_limit: 1,
    p_ids: [id],
  });
  if (error) { console.error('Error fetching producto market:', error.message); return null; }
  const row = (data as VidrieraRow[] | null)?.[0];
  return row && row.tipo === 'market' ? toProductoMarket(row) : null;
}

export async function fetchProductosSecondHand(filters?: ProductosFilters): Promise<ProductoSecondHand[]> {
  const rows = await fetchVidriera(filters);
  return rows.filter(r => r.tipo === 'secondhand').map(toProductoSecondHand);
}

export async function fetchProductoSecondHandById(id: string): Promise<ProductoSecondHand | null> {
  const { data, error } = await supabase.rpc('catalog_vidriera', {
    p_currency: 'UYU',
    p_limit: 1,
    p_ids: [id],
  });
  if (error) { console.error('Error fetching producto secondhand:', error.message); return null; }
  const row = (data as VidrieraRow[] | null)?.[0];
  return row && row.tipo === 'secondhand' ? toProductoSecondHand(row) : null;
}

/**
 * ESCRITURA — BLOQUEADO, no implementado a propósito.
 *
 * Las funciones create/update/delete que existían acá apuntaban a
 * `productos_market` / `productos_secondhand` (tablas caídas) y no tenían
 * NINGÚN caller en el repo (grep confirmado: sólo `useProductos.ts` usa las
 * de lectura). No las reimplemento sobre catalog_* porque escribir un
 * producto ahora es `crear_publicacion` / `actualizar_publicacion`
 * (ver AdminPublicaciones.tsx), y esas RPCs resuelven la tienda por el claim
 * `store_id` del JWT — piso reservado a miembros de `store_members`, que hoy
 * es de alta administrativa, no self-service (20260822000000_store_
 * membership_and_jwt_claim.sql). Un usuario final sin tienda no tiene forma
 * de publicar bajo ese modelo tal como está. Antes de escribir estas
 * funciones hace falta esa decisión de producto — no es algo para inventar
 * acá. Ver .agent/TASK.md.
 */
