import { describe, it, expect } from "vitest";
import {
  drawReward,
  effectiveStatus,
  canApply,
  assertOwnership,
  OwnershipError,
  playGame,
  usePrize,
  type Reward,
  type Prize,
  type RewardsRepository,
  type Clock,
  type IdGenerator,
  DuplicatePlayError,
} from "../index.js";

const rewards: Reward[] = [
  { id: "r1", name: "10% OFF", description: "", benefit: { type: "PERCENTAGE_DISCOUNT", value: 10 }, weight: 60, validityMs: 72 * 3600_000, active: true },
  { id: "r2", name: "Envío gratis", description: "", benefit: { type: "FREE_SHIPPING", value: 0 }, weight: 30, validityMs: 72 * 3600_000, active: true },
  { id: "r3", name: "Gift $500", description: "", benefit: { type: "GIFT_CARD", value: 500 }, weight: 10, validityMs: 72 * 3600_000, active: true },
  { id: "rX", name: "Inactivo", description: "", benefit: { type: "FIXED_DISCOUNT", value: 1 }, weight: 999, validityMs: 1000, active: false },
];

describe("drawReward", () => {
  it("respeta los pesos según el rng inyectado", () => {
    // rng -> threshold = 0.0 cae en el primer reward (r1).
    expect(drawReward(rewards, () => 0).id).toBe("r1");
    // threshold justo dentro del segundo tramo (60..90 de 100).
    expect(drawReward(rewards, () => 0.7).id).toBe("r2");
    // último tramo (90..100).
    expect(drawReward(rewards, () => 0.95).id).toBe("r3");
  });

  it("ignora rewards inactivos aunque tengan peso enorme", () => {
    expect(drawReward(rewards, () => 0.999999).id).not.toBe("rX");
  });

  it("falla si no hay candidatos válidos", () => {
    expect(() => drawReward([], () => 0.5)).toThrow();
  });

  it("la distribución converge a los pesos", () => {
    let seed = 1;
    const lcg = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    const counts: Record<string, number> = { r1: 0, r2: 0, r3: 0 };
    for (let i = 0; i < 20000; i++) counts[drawReward(rewards, lcg).id]++;
    expect(counts.r1 / 20000).toBeCloseTo(0.6, 1);
    expect(counts.r2 / 20000).toBeCloseTo(0.3, 1);
  });
});

function makePrize(overrides: Partial<Prize> = {}): Prize {
  const now = new Date("2026-01-01T00:00:00Z");
  return {
    id: "p1", code: "ABC-123", userId: "u1", rewardId: "r1", cartId: "c1", playId: "pl1",
    status: "AVAILABLE", createdAt: now, startsAt: now,
    expiresAt: new Date(now.getTime() + 3600_000), usedAt: null,
    benefit: { type: "PERCENTAGE_DISCOUNT", value: 10 }, name: "10% OFF",
    ...overrides,
  };
}

describe("effectiveStatus", () => {
  const now = new Date("2026-01-01T00:30:00Z");
  it("AVAILABLE dentro de la ventana", () => {
    expect(effectiveStatus(makePrize(), now)).toBe("AVAILABLE");
  });
  it("EXPIRED si pasó expiresAt, aunque la base diga AVAILABLE", () => {
    const p = makePrize({ expiresAt: new Date("2026-01-01T00:10:00Z") });
    expect(effectiveStatus(p, now)).toBe("EXPIRED");
    expect(canApply(p, now)).toBe(false);
  });
  it("USED es terminal", () => {
    expect(effectiveStatus(makePrize({ status: "USED" }), now)).toBe("USED");
  });
});

describe("titularidad", () => {
  it("rechaza dueño ajeno", () => {
    expect(() => assertOwnership(makePrize(), "otro")).toThrow(OwnershipError);
  });
});

// --- Repositorio en memoria para casos de uso ---
function inMemoryRepo() {
  const prizes = new Map<string, Prize>();
  const byKey = new Map<string, string>(); // userId:key -> prizeId
  let carts = 0;
  const repo: RewardsRepository = {
    async listActiveRewards() { return rewards; },
    async findPrizeByPlayKey(userId, key) {
      const id = byKey.get(`${userId}:${key}`);
      return id ? prizes.get(id)! : null;
    },
    async findActiveCart() { return carts > 0 ? { id: "cart-1" } : null; },
    async createCart(_u, id) { carts++; return { id }; },
    async persistPrize(prize, key) {
      const k = `${prize.userId}:${key}`;
      if (byKey.has(k)) throw new DuplicatePlayError();
      byKey.set(k, prize.id);
      prizes.set(prize.id, prize);
    },
    async getPrize(id) { return prizes.get(id) ?? null; },
    async listPrizesByUser(userId) {
      return [...prizes.values()].filter((p) => p.userId === userId);
    },
    async markUsed(id, usedAt) {
      const p = prizes.get(id)!; prizes.set(id, { ...p, status: "USED", usedAt });
    },
    async expirePrizes() { return 0; },
  };
  return repo;
}

const clock: Clock = { now: () => new Date("2026-01-01T00:00:00Z") };
let counter = 0;
const ids: IdGenerator = { id: () => `id-${counter++}`, code: () => `CODE-${counter++}` };

describe("playGame", () => {
  it("crea un premio anclado al usuario con carrito automático", async () => {
    const repo = inMemoryRepo();
    const view = await playGame({ repo, clock, ids, rng: () => 0 }, { userId: "u1", idempotencyKey: "k1" });
    expect(view.userId).toBe("u1");
    expect(view.status).toBe("AVAILABLE");
    expect(view.cartId).toBeTruthy();
    expect(view.code).toBeTruthy();
  });

  it("es idempotente: misma tirada => mismo premio, no duplica", async () => {
    const repo = inMemoryRepo();
    const a = await playGame({ repo, clock, ids, rng: () => 0 }, { userId: "u1", idempotencyKey: "same" });
    const b = await playGame({ repo, clock, ids, rng: () => 0.9 }, { userId: "u1", idempotencyKey: "same" });
    expect(b.id).toBe(a.id);
    expect((await repo.listPrizesByUser("u1")).length).toBe(1);
  });
});

describe("usePrize", () => {
  it("marca USED un premio vigente del propio usuario", async () => {
    const repo = inMemoryRepo();
    const won = await playGame({ repo, clock, ids, rng: () => 0 }, { userId: "u1", idempotencyKey: "k" });
    const used = await usePrize({ repo, clock }, { userId: "u1", prizeId: won.id });
    expect(used.effectiveStatus).toBe("USED");
  });

  it("no permite usar un premio ajeno", async () => {
    const repo = inMemoryRepo();
    const won = await playGame({ repo, clock, ids, rng: () => 0 }, { userId: "u1", idempotencyKey: "k" });
    await expect(usePrize({ repo, clock }, { userId: "intruso", prizeId: won.id })).rejects.toThrow(OwnershipError);
  });
});
