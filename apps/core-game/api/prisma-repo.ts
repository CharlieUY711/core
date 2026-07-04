/**
 * apps/core-game/api/prisma-repo.ts
 *
 * Implementación del puerto RewardsRepository con Prisma. Es la única pieza que
 * conoce la base de datos; el dominio sigue siendo puro. La idempotencia y la
 * unicidad se delegan a constraints de Postgres (no a chequeos en memoria), que
 * es lo que sostiene la garantía bajo concurrencia.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import {
  type RewardsRepository,
  type Prize,
  type Reward,
  type BenefitType,
  type PrizeStatus,
  DuplicatePlayError,
} from "@core/rewards";

const prisma = new PrismaClient();

// Mapeo fila Prisma -> entidad de dominio.
function toDomainReward(r: any): Reward {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    benefit: { type: r.benefitType as BenefitType, value: r.benefitValue },
    weight: r.weight,
    validityMs: r.validityMs,
    active: r.active,
    imageUrl: r.imageUrl ?? undefined,
  };
}

function toDomainPrize(p: any): Prize {
  return {
    id: p.id,
    code: p.code,
    userId: p.userId,
    rewardId: p.rewardId,
    cartId: p.cartId,
    playId: p.playId,
    status: p.status as PrizeStatus,
    createdAt: p.createdAt,
    startsAt: p.startsAt,
    expiresAt: p.expiresAt,
    usedAt: p.usedAt,
    benefit: { type: p.benefitType as BenefitType, value: p.benefitValue },
    name: p.name,
  };
}

export const prismaRewardsRepo: RewardsRepository = {
  async listActiveRewards() {
    const rows = await prisma.reward.findMany({ where: { active: true } });
    return rows.map(toDomainReward);
  },

  async findPrizeByPlayKey(userId, idempotencyKey) {
    const play = await prisma.play.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      include: { prize: true },
    });
    return play?.prize ? toDomainPrize(play.prize) : null;
  },

  async findActiveCart(userId) {
    const cart = await prisma.cart.findFirst({
      where: { userId, status: "ACTIVE" },
    });
    return cart ? { id: cart.id } : null;
  },

  async createCart(userId, cartId) {
    const cart = await prisma.cart.create({
      data: { id: cartId, userId, status: "ACTIVE" },
    });
    return { id: cart.id };
  },

  async persistPrize(prize, idempotencyKey) {
    try {
      // Tirada + premio en una transacción. El unique de Play resuelve carreras.
      await prisma.$transaction([
        prisma.play.create({
          data: { id: prize.playId, userId: prize.userId, idempotencyKey },
        }),
        prisma.prize.create({
          data: {
            id: prize.id,
            code: prize.code,
            userId: prize.userId,
            rewardId: prize.rewardId,
            cartId: prize.cartId,
            playId: prize.playId,
            status: prize.status,
            createdAt: prize.createdAt,
            startsAt: prize.startsAt,
            expiresAt: prize.expiresAt,
            usedAt: prize.usedAt,
            benefitType: prize.benefit.type,
            benefitValue: prize.benefit.value,
            name: prize.name,
          },
        }),
      ]);
    } catch (err) {
      // P2002 = violación de unique => tirada duplicada (request concurrente).
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new DuplicatePlayError();
      }
      throw err;
    }
  },

  async getPrize(prizeId) {
    const p = await prisma.prize.findUnique({ where: { id: prizeId } });
    return p ? toDomainPrize(p) : null;
  },

  async listPrizesByUser(userId) {
    const rows = await prisma.prize.findMany({ where: { userId } });
    return rows.map(toDomainPrize);
  },

  async markUsed(prizeId, usedAt) {
    // updateMany con filtro status=AVAILABLE => la transición se valida en la base.
    const res = await prisma.prize.updateMany({
      where: { id: prizeId, status: "AVAILABLE" },
      data: { status: "USED", usedAt },
    });
    if (res.count === 0) throw new Error("El premio ya no es aplicable.");
  },

  async expirePrizes(now) {
    const res = await prisma.prize.updateMany({
      where: { status: "AVAILABLE", expiresAt: { lte: now } },
      data: { status: "EXPIRED" },
    });
    return res.count;
  },
};

export { prisma };
