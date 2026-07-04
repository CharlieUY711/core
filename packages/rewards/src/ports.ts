/**
 * Puertos: lo que el dominio necesita del mundo exterior, expresado como
 * interfaces. La capa de infraestructura (Prisma, en `apps/core-game/api`) los
 * implementa. Así los casos de uso se testean sin base de datos y se reusan
 * idénticos en cualquier app del monorepo.
 */
import type { Prize, Reward } from "./types.js";

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  /** ID opaco para entidades (prize, play, cart). */
  id(): string;
  /** Código público único e irrepetible del premio. */
  code(): string;
}

export interface RewardsRepository {
  /** Catálogo activo para la tirada. */
  listActiveRewards(): Promise<Reward[]>;

  /**
   * Idempotencia de la tirada: si ya existe un premio para `idempotencyKey`,
   * devolverlo. Garantiza 1 request repetida != 2 premios.
   */
  findPrizeByPlayKey(userId: string, idempotencyKey: string): Promise<Prize | null>;

  /** Carrito vigente del usuario, o null si no tiene. */
  findActiveCart(userId: string): Promise<{ id: string } | null>;
  createCart(userId: string, cartId: string): Promise<{ id: string }>;

  /**
   * Persiste premio + tirada en UNA transacción, con `idempotencyKey` único a
   * nivel base. Si dos requests corren en paralelo, una falla por constraint y
   * el caso de uso reintenta leyendo el premio ya creado.
   */
  persistPrize(prize: Prize, idempotencyKey: string): Promise<void>;

  getPrize(prizeId: string): Promise<Prize | null>;
  listPrizesByUser(userId: string): Promise<Prize[]>;

  /** Marca como USED. Debe validar transición a nivel base (status = AVAILABLE). */
  markUsed(prizeId: string, usedAt: Date): Promise<void>;

  /** Barrido: vence en lote y los quita del carrito. */
  expirePrizes(now: Date): Promise<number>;
}

/** Error de idempotencia para reintento controlado del caso de uso. */
export class DuplicatePlayError extends Error {
  constructor() {
    super("Tirada duplicada");
    this.name = "DuplicatePlayError";
  }
}
