/**
 * carritoApi — misma lógica que core-market/carritoApi.ts
 * La tabla "carrito" es compartida. El premio se inserta como
 * producto_tipo = "reward" con los metadatos del prize.
 */
import { supabase } from "@/lib/supabase/client";

// sesion_id persistida en localStorage (igual que Market)
function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem("sesion_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("sesion_id", id); }
  return id;
}

export interface RewardCartItem {
  sesion_id:       string;
  usuario_id?:     string;
  producto_id:     string;   // reward_id
  producto_tipo:   "reward";
  cantidad:        number;   // siempre 1
  precio_unitario: number;   // siempre 0
  // campos extra que Market ignora pero nosotros guardamos en metadata
  reward_label?:   string;
  reward_emoji?:   string;
  reward_expires_at?: string;
  reward_campaign_id?: string;
}

/** Escribe el premio directamente en la tabla carrito de Market */
export async function aplicarPremioAlCarrito(
  rewardId:    string,
  rewardLabel: string,
  rewardEmoji: string,
  campaignId:  string,
  expiresAt:   string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const sesionId  = getSessionId();
    const { data: { session } } = await supabase.auth.getSession();
    const usuarioId = session?.user?.id;

    // Eliminar premio anterior si existe (un solo premio activo por sesión)
    await supabase
      .from("carrito")
      .delete()
      .eq("sesion_id", sesionId)
      .eq("producto_tipo", "reward");

    const { error } = await supabase
      .from("carrito")
      .insert({
        sesion_id:        sesionId,
        usuario_id:       usuarioId ?? null,
        producto_id:      rewardId,
        producto_tipo:    "reward",
        cantidad:         1,
        precio_unitario:  0,
        // Guardamos los datos del premio en columnas opcionales
        // Si la tabla no las tiene, Supabase las ignora sin error
        reward_label:     rewardLabel,
        reward_emoji:     rewardEmoji,
        reward_expires_at:expiresAt,
        reward_campaign_id: campaignId,
      });

    if (error) {
      // Si falla por columnas inexistentes, reintentamos con solo las columnas base
      const { error: error2 } = await supabase
        .from("carrito")
        .insert({
          sesion_id:       sesionId,
          usuario_id:      usuarioId ?? null,
          producto_id:     rewardId,
          producto_tipo:   "reward",
          cantidad:        1,
          precio_unitario: 0,
        });
      if (error2) return { ok: false, error: error2.message };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Lee si hay un premio activo en el carrito de esta sesión */
export async function getPremioActivo(): Promise<RewardCartItem | null> {
  try {
    const sesionId = getSessionId();
    const { data } = await supabase
      .from("carrito")
      .select("*")
      .eq("sesion_id", sesionId)
      .eq("producto_tipo", "reward")
      .single();
    return data ?? null;
  } catch { return null; }
}

/** Elimina el premio del carrito */
export async function eliminarPremioDelCarrito(): Promise<void> {
  const sesionId = getSessionId();
  await supabase
    .from("carrito")
    .delete()
    .eq("sesion_id", sesionId)
    .eq("producto_tipo", "reward");
}
