/**
 * @core/rewards — Tipos del dominio.
 *
 * Modela la titularidad y persistencia del premio descritas en la
 * Especificación Funcional. Todo es framework-agnóstico: este paquete no
 * conoce HTTP, React ni Prisma. Lo consumen `apps/core-game` y
 * `apps/core-market` por igual vía `workspace:*`.
 */

/** Tipo de beneficio que otorga un premio. */
export type BenefitType =
  | "PERCENTAGE_DISCOUNT" // value = % (ej. 15 => 15%)
  | "FIXED_DISCOUNT" // value = monto en la moneda base
  | "FREE_SHIPPING" // value ignorado
  | "FREE_PRODUCT" // value = productId (referencia)
  | "GIFT_CARD"; // value = monto

/**
 * Reward (catálogo). Es la *plantilla* del premio: lo que puede salir en la
 * tirada. Su `id` es el `rewardId` de la especificación.
 */
export interface Reward {
  id: string;
  name: string;
  description: string;
  benefit: { type: BenefitType; value: number };
  /** Peso relativo para la tirada ponderada. Mayor peso => más probable. */
  weight: number;
  /** Cuánto vive el premio una vez ganado, en milisegundos. */
  validityMs: number;
  active: boolean;
  imageUrl?: string;
}

/**
 * Estados públicos del premio (Disponible / Utilizado / Expirado).
 * `PENDING` solo aplica si `startsAt` es futuro; en el flujo normal no se usa.
 */
export type PrizeStatus = "AVAILABLE" | "USED" | "EXPIRED" | "PENDING";

/**
 * Prize (instancia ganada). Es lo que pertenece *permanentemente* a un usuario.
 * Nunca se asocia a un dispositivo ni a un navegador: la titularidad vive aquí,
 * anclada a `userId`, y es inmutable.
 */
export interface Prize {
  id: string;
  /** Código único e irrepetible del premio (no reutilizable vía enlaces). */
  code: string;
  userId: string;
  rewardId: string;
  cartId: string;
  /** Tirada que originó el premio. Garantiza 1 tirada = 1 premio. */
  playId: string;

  status: PrizeStatus;
  createdAt: Date;
  startsAt: Date;
  expiresAt: Date;
  /** Se setea al aplicarse en el checkout. */
  usedAt: Date | null;

  /** Snapshot del beneficio al momento de ganarlo (no depende del catálogo). */
  benefit: { type: BenefitType; value: number };
  name: string;
}

/** Vista enriquecida para "Mis Premios": agrega estado efectivo y tiempo restante. */
export interface PrizeView extends Prize {
  effectiveStatus: PrizeStatus;
  remainingMs: number;
  canApply: boolean;
}
