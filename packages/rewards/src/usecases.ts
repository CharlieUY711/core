/**
 * Casos de uso de la feature. Orquestan dominio + puertos. No saben de HTTP.
 *
 * Flujo central (playGame) implementa la especificación al pie:
 *   1. Tirada resuelta en servidor (ponderada, cripto-aleatoria).
 *   2. Premio vinculado de forma permanente al usuario, con código único.
 *   3. Carrito creado automáticamente si no existe.
 *   4. Beneficio aplicado y premio reservado mientras esté vigente.
 *   5. Idempotente: una misma tirada (idempotencyKey) nunca da dos premios.
 */
import type { Prize, PrizeView } from "./types.js";
import { drawReward, type Rng, cryptoRng } from "./draw.js";
import { canApply, toView, canTransition, effectiveStatus } from "./status.js";
import { assertOwnership } from "./security.js";
import {
  type Clock,
  type IdGenerator,
  type RewardsRepository,
  DuplicatePlayError,
} from "./ports.js";

export interface UseCaseDeps {
  repo: RewardsRepository;
  clock: Clock;
  ids: IdGenerator;
  rng?: Rng;
}

export interface PlayInput {
  userId: string;
  /** Token único de la tirada generado por el cliente al iniciar el giro. */
  idempotencyKey: string;
}

/**
 * Ejecuta una tirada y materializa el premio. Devuelve la vista lista para
 * redirigir al carrito.
 */
export async function playGame(
  deps: UseCaseDeps,
  input: PlayInput
): Promise<PrizeView> {
  const { repo, clock, ids, rng = cryptoRng } = deps;
  const { userId, idempotencyKey } = input;

  // (1) Idempotencia: ¿ya jugamos esta tirada?
  const existing = await repo.findPrizeByPlayKey(userId, idempotencyKey);
  if (existing) return toView(existing, clock.now());

  // (2) Carrito automático.
  const cart =
    (await repo.findActiveCart(userId)) ??
    (await repo.createCart(userId, ids.id()));

  // (3) Tirada server-authoritative.
  const rewards = await repo.listActiveRewards();
  const reward = drawReward(rewards, rng);

  // (4) Materializar premio anclado al usuario.
  const now = clock.now();
  const prize: Prize = {
    id: ids.id(),
    code: ids.code(),
    userId,
    rewardId: reward.id,
    cartId: cart.id,
    playId: ids.id(),
    status: "AVAILABLE",
    createdAt: now,
    startsAt: now,
    expiresAt: new Date(now.getTime() + reward.validityMs),
    usedAt: null,
    benefit: { ...reward.benefit },
    name: reward.name,
  };

  // (5) Persistir de forma idempotente. Si una request paralela ganó la carrera,
  // releemos el premio ya creado en vez de duplicar.
  try {
    await repo.persistPrize(prize, idempotencyKey);
  } catch (err) {
    if (err instanceof DuplicatePlayError) {
      const winner = await repo.findPrizeByPlayKey(userId, idempotencyKey);
      if (winner) return toView(winner, clock.now());
    }
    throw err;
  }

  return toView(prize, clock.now());
}

/** "Mis Premios": lista del usuario con estado efectivo y tiempo restante. */
export async function getMyPrizes(
  deps: Pick<UseCaseDeps, "repo" | "clock">,
  userId: string
): Promise<PrizeView[]> {
  const now = deps.clock.now();
  const prizes = await deps.repo.listPrizesByUser(userId);
  return prizes
    .map((p) => toView(p, now))
    .sort((a, b) => statusRank(a) - statusRank(b) || a.remainingMs - b.remainingMs);
}

function statusRank(v: PrizeView): number {
  return { AVAILABLE: 0, PENDING: 1, USED: 2, EXPIRED: 3 }[v.effectiveStatus];
}

/** Aplica el premio en el checkout. Valida titularidad y vigencia. */
export async function usePrize(
  deps: Pick<UseCaseDeps, "repo" | "clock">,
  input: { userId: string; prizeId: string }
): Promise<PrizeView> {
  const now = deps.clock.now();
  const prize = await deps.repo.getPrize(input.prizeId);
  if (!prize) throw new Error("Premio inexistente.");

  // Titularidad: nadie aplica un premio ajeno, aunque tenga el id o el código.
  assertOwnership(prize, input.userId);

  if (!canApply(prize, now)) {
    throw new Error(
      `El premio no puede aplicarse (estado: ${effectiveStatus(prize, now)}).`
    );
  }
  if (!canTransition(prize.status, "USED")) {
    throw new Error("Transición de estado inválida.");
  }

  await deps.repo.markUsed(input.prizeId, now);
  return toView({ ...prize, status: "USED", usedAt: now }, now);
}

/** Barrido periódico (cron): vence premios y los quita de los carritos. */
export async function expireSweep(
  deps: Pick<UseCaseDeps, "repo" | "clock">
): Promise<number> {
  return deps.repo.expirePrizes(deps.clock.now());
}
