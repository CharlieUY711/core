/**
 * Adaptador Market — consume users/auth/sessions/cart/checkout existentes.
 * NO crea usuarios, NO crea autenticación paralela, NO genera cupones.
 * Escribe directamente sobre el carrito de Market.
 */
import type { CartRewardPayload, RewardAssignment } from "@/lib/reward-engine/types";

const API = process.env.NEXT_PUBLIC_MARKET_API_URL ?? "";

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface MarketSession {
  user: { id: string; name: string; email: string } | null;
  cartId?: string;
}

export async function fetchMarketSession(): Promise<MarketSession | null> {
  try {
    const r = await fetch(`${API}/api/auth/session`, { credentials: "include" });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

// ── Cart ──────────────────────────────────────────────────────────────────────

export async function applyRewardToCart(
  cartId:  string,
  payload: CartRewardPayload,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch(`${API}/api/cart/${cartId}/reward`, {
      method:      "PATCH",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify(payload),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({})) as { message?: string };
      return { ok: false, error: err.message ?? "error_applying_reward" };
    }
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e) }; }
}

export async function removeRewardFromCart(
  cartId:   string,
  rewardId: string,
): Promise<{ ok: boolean }> {
  try {
    const r = await fetch(`${API}/api/cart/${cartId}/reward/${rewardId}`, {
      method:      "DELETE",
      credentials: "include",
    });
    return { ok: r.ok };
  } catch { return { ok: false }; }
}

// ── Checkout validation ───────────────────────────────────────────────────────

export async function validateRewardCheckout(
  assignment: RewardAssignment,
  cartId:     string,
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const r = await fetch(`${API}/api/checkout/validate-reward`, {
      method:      "POST",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify({ assignmentId: assignment.id, cartId }),
    });
    return r.ok ? r.json() : { valid: false, reason: "validation_failed" };
  } catch { return { valid: false, reason: "network_error" }; }
}
