import { SEGMENTS, segmentByKey, type Segment } from "./segments.js";
import type { GameClient, GameSession, UiPrize } from "./types.js";

const VALIDITY_MS = 72 * 60 * 60 * 1000;

function makeCode(): string {
  const h = () => Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, "0");
  return `${h()}-${h()}-${h()}`;
}
function drawSegment(segments: Segment[]): Segment {
  const pool = segments.filter((s) => s.weight > 0);
  const total = pool.reduce((a, s) => a + s.weight, 0);
  let t = Math.random() * total;
  for (const s of pool) { t -= s.weight; if (t < 0) return s; }
  return pool[pool.length - 1];
}
function effective(p: UiPrize, now: number): UiPrize {
  if (p.status === "AVAILABLE" && p.expiresAt <= now) return { ...p, status: "EXPIRED" };
  return p;
}

/**
 * Cliente mock: tirada y persistencia en memoria. Reproduce el comportamiento
 * server-authoritative (decide el premio acá) para demos y para el panel
 * embebido sin backend todavía.
 */
export function createMockClient(opts: { segments?: Segment[] } = {}): GameClient {
  const segments = opts.segments ?? SEGMENTS;
  const store = new Map<string, UiPrize>();
  const byKey = new Map<string, string>();

  return {
    async listPrizes() {
      const now = Date.now();
      return [...store.values()].map((p) => effective(p, now));
    },
    async play(idempotencyKey) {
      const existing = byKey.get(idempotencyKey);
      if (existing) return effective(store.get(existing)!, Date.now());
      const seg = drawSegment(segments);
      const now = Date.now();
      const prize: UiPrize = {
        id: `pr_${now}_${Math.random().toString(36).slice(2, 7)}`,
        code: makeCode(),
        segKey: seg.key,
        name: seg.name,
        benefitText: seg.benefitText,
        status: "AVAILABLE",
        createdAt: now,
        expiresAt: now + VALIDITY_MS,
        usedAt: null,
      };
      store.set(prize.id, prize);
      byKey.set(idempotencyKey, prize.id);
      return prize;
    },
    async use(prizeId) {
      const p = store.get(prizeId);
      if (!p) throw new Error("Premio inexistente");
      const now = Date.now();
      if (effective(p, now).status !== "AVAILABLE") throw new Error("No aplicable");
      const used: UiPrize = { ...p, status: "USED", usedAt: now };
      store.set(prizeId, used);
      return used;
    },
  };
}

/**
 * Cliente HTTP de producción. Habla con apps/core-game/api.
 * La sesión la maneja el host (cookie de Auth.js): fetch va con credentials.
 */
export function createHttpClient(baseUrl = ""): GameClient {
  const url = (p: string) => `${baseUrl.replace(/\/$/, "")}${p}`;
  const opts: RequestInit = { credentials: "include", headers: { "Content-Type": "application/json" } };

  // El servidor devuelve PrizeView (dominio). Lo mapeamos a UiPrize.
  const toUi = (v: any): UiPrize => ({
    id: v.id,
    code: v.code,
    segKey: v.segKey ?? v.rewardId ?? "disc10",
    name: v.name,
    benefitText: v.benefitText ?? formatBenefit(v.benefit, v.name),
    status: v.effectiveStatus ?? v.status,
    createdAt: +new Date(v.createdAt),
    expiresAt: +new Date(v.expiresAt),
    usedAt: v.usedAt ? +new Date(v.usedAt) : null,
  });

  return {
    async listPrizes() {
      const r = await fetch(url("/api/prizes"), opts);
      if (!r.ok) throw new Error(`prizes ${r.status}`);
      return (await r.json()).prizes.map(toUi);
    },
    async play(idempotencyKey) {
      const r = await fetch(url("/api/play"), { ...opts, method: "POST", body: JSON.stringify({ idempotencyKey }) });
      if (!r.ok) throw new Error(`play ${r.status}`);
      return toUi((await r.json()).prize);
    },
    async use(prizeId) {
      const r = await fetch(url(`/api/prizes/${prizeId}/use`), { ...opts, method: "POST" });
      if (!r.ok) throw new Error(`use ${r.status}`);
      return toUi((await r.json()).prize);
    },
  };
}

function formatBenefit(b: { type: string; value: number } | undefined, name: string): string {
  if (!b) return name;
  switch (b.type) {
    case "PERCENTAGE_DISCOUNT": return `${b.value}% OFF en tu compra`;
    case "FIXED_DISCOUNT": return `$${b.value} de descuento`;
    case "FREE_SHIPPING": return "Envío gratis";
    case "GIFT_CARD": return `$${b.value} de saldo Market`;
    default: return name;
  }
}

export { segmentByKey };
