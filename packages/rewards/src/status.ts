/**
 * Ciclo de vida del premio.
 *
 * El estado almacenado en la base es la "última verdad escrita", pero el estado
 * *efectivo* se computa siempre contra el reloj: un premio AVAILABLE cuya ventana
 * de vigencia ya pasó es, a todos los efectos, EXPIRED — aunque el barrido
 * programado todavía no lo haya marcado. Esto evita ventanas de carrera donde un
 * premio vencido podría aplicarse en el checkout.
 */
import type { Prize, PrizeStatus, PrizeView } from "./types.js";

/** Transiciones permitidas. USED y EXPIRED son terminales. */
const TRANSITIONS: Record<PrizeStatus, PrizeStatus[]> = {
  PENDING: ["AVAILABLE", "EXPIRED"],
  AVAILABLE: ["USED", "EXPIRED"],
  USED: [],
  EXPIRED: [],
};

export function canTransition(from: PrizeStatus, to: PrizeStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/**
 * Estado efectivo dado un instante `now`.
 * - USED / EXPIRED son terminales y se respetan.
 * - AVAILABLE/PENDING se reevalúan contra la ventana [startsAt, expiresAt).
 */
export function effectiveStatus(prize: Prize, now: Date): PrizeStatus {
  if (prize.status === "USED" || prize.status === "EXPIRED") return prize.status;
  if (now.getTime() >= prize.expiresAt.getTime()) return "EXPIRED";
  if (now.getTime() < prize.startsAt.getTime()) return "PENDING";
  return "AVAILABLE";
}

/** ¿Puede aplicarse en el checkout ahora mismo? Única fuente de verdad para "Usar". */
export function canApply(prize: Prize, now: Date): boolean {
  return effectiveStatus(prize, now) === "AVAILABLE";
}

export function remainingMs(prize: Prize, now: Date): number {
  return Math.max(0, prize.expiresAt.getTime() - now.getTime());
}

/** Proyecta un Prize a la vista usada por "Mis Premios" y por el carrito. */
export function toView(prize: Prize, now: Date): PrizeView {
  const eff = effectiveStatus(prize, now);
  return {
    ...prize,
    effectiveStatus: eff,
    remainingMs: remainingMs(prize, now),
    canApply: eff === "AVAILABLE",
  };
}
