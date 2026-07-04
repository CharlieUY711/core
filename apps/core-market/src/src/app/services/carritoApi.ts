import { supabase } from "../../utils/supabase/client";
import { getCartSessionId } from "@core/session";

export interface CarritoItem {
  id: string;
  usuario_id?: string;
  sesion_id?: string;
  producto_id: string;
  producto_tipo: "market" | "secondhand";
  cantidad: number;
  precio_unitario: number;
  nombre?: string;
  imagen?: string;
  created_at?: string;
  updated_at?: string;
}

function getSessionId(): string {
  // sesion_id vive en cookie compartida (@core/session), no localStorage,
  // para que el carrito armado en app.core.com.uy (landing IG) sea el mismo
  // carrito que ve market.core.com.uy.
  return getCartSessionId(import.meta.env.VITE_COOKIE_DOMAIN);
}

export async function getCarrito(): Promise<CarritoItem[]> {
  const sesionId = getSessionId();
  const { data, error } = await supabase
    .from("carrito")
    .select("*")
    .eq("sesion_id", sesionId)
    .order("created_at", { ascending: true });
  if (error) { console.error("getCarrito:", error); return []; }
  const rows = (data || []) as CarritoItem[];
  if (rows.length === 0) return rows;

  // El carrito no guarda nombre/imagen: se derivan del producto (por UUID).
  const ids = rows.map(r => r.producto_id);
  const info: Record<string, { nombre?: string; imagen?: string }> = {};
  const firstImg = (p: any): string =>
    p.imagen_principal || (typeof p.imagenes?.[0] === 'string' ? p.imagenes[0] : p.imagenes?.[0]?.url) || '';
  const addInfo = (arr: any[] | null | undefined) =>
    (arr || []).forEach((p: any) => { if (!info[p.id]) info[p.id] = { nombre: p.nombre, imagen: firstImg(p) }; });

  try {
    // Tabla canónica
    const { data: art } = await supabase
      .from("articulos").select("id, nombre, imagen_principal, imagenes").in("id", ids);
    addInfo(art);
    // Legacy, solo para los que falten
    const missing = ids.filter(id => !info[id]);
    if (missing.length) {
      const mktIds = rows.filter(r => r.producto_tipo === "market" && missing.includes(r.producto_id)).map(r => r.producto_id);
      const shIds  = rows.filter(r => r.producto_tipo === "secondhand" && missing.includes(r.producto_id)).map(r => r.producto_id);
      if (mktIds.length) { const { data: mk } = await supabase.from("productos_market").select("id, nombre, imagen_principal, imagenes").in("id", mktIds); addInfo(mk); }
      if (shIds.length)  { const { data: sh } = await supabase.from("productos_secondhand").select("id, nombre, imagen_principal, imagenes").in("id", shIds); addInfo(sh); }
    }
  } catch (e) { console.error("getCarrito enrich:", e); }

  return rows.map(r => {
    const extra = info[r.producto_id] || {};
    return { ...r, nombre: extra.nombre, imagen: extra.imagen };
  });
}

export async function agregarAlCarrito(
  producto_id: string,
  producto_tipo: "market" | "secondhand",
  cantidad: number = 1,
  precio_unitario: number
): Promise<CarritoItem> {
  const sesionId = getSessionId();
  const { data: existing, error: checkError } = await supabase
    .from("carrito")
    .select("*")
    .eq("sesion_id", sesionId)
    .eq("producto_id", producto_id)
    .eq("producto_tipo", producto_tipo)
    .maybeSingle();

  if (checkError) throw checkError;

  if (existing) {
    const { data, error } = await supabase
      .from("carrito")
      .update({ cantidad: existing.cantidad + cantidad, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("carrito")
    .insert({ sesion_id: sesionId, producto_id, producto_tipo, cantidad, precio_unitario })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function actualizarItemCarrito(itemId: string, cantidad: number): Promise<CarritoItem> {
  const { data, error } = await supabase
    .from("carrito")
    .update({ cantidad, updated_at: new Date().toISOString() })
    .eq("id", itemId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function eliminarItemCarrito(itemId: string): Promise<void> {
  const { error } = await supabase.from("carrito").delete().eq("id", itemId);
  if (error) throw error;
}

export async function vaciarCarrito(): Promise<void> {
  const sesionId = getSessionId();
  const { error } = await supabase.from("carrito").delete().eq("sesion_id", sesionId);
  if (error) throw error;
}




