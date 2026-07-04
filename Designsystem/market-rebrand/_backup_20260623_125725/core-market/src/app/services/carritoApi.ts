import { supabase } from "../../utils/supabase/client";

export interface CarritoItem {
  id: string;
  usuario_id?: string;
  sesion_id?: string;
  producto_id: string;
  producto_tipo: "market" | "secondhand";
  cantidad: number;
  precio_unitario: number;
  created_at?: string;
  updated_at?: string;
}

function getSessionId(): string {
  let id = localStorage.getItem("sesion_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("sesion_id", id); }
  return id;
}

export async function getCarrito(): Promise<CarritoItem[]> {
  const sesionId = getSessionId();
  const { data, error } = await supabase
    .from("carrito")
    .select("*")
    .eq("sesion_id", sesionId)
    .order("created_at", { ascending: true });
  if (error) { console.error("getCarrito:", error); return []; }
  return data || [];
}

export async function agregarAlCarrito(
  producto_id: string,
  producto_tipo: "market" | "secondhand",
  cantidad: number = 1,
  precio_unitario: number
): Promise<CarritoItem> {
  const sesionId = getSessionId();
  const { data: existing } = await supabase
    .from("carrito")
    .select("*")
    .eq("sesion_id", sesionId)
    .eq("producto_id", producto_id)
    .eq("producto_tipo", producto_tipo)
    .single();

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




