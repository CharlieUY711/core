/**
 * apps/core-game/api/index.ts
 *
 * Capa de transporte (Hono, corre en Vercel Functions). Es deliberadamente
 * delgada: autentica, extrae input y delega en los casos de uso de @core/rewards.
 * Ninguna regla de negocio vive acá.
 *
 * Punto clave de seguridad: el `userId` SIEMPRE sale de la sesión autenticada,
 * NUNCA del body ni de la query. Por eso un enlace compartido no sirve para
 * reclamar el premio de otro: no porta identidad.
 */
import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import {
  playGame,
  getMyPrizes,
  usePrize,
  expireSweep,
  OwnershipError,
  cryptoRng,
} from "@core/rewards";
import { prismaRewardsRepo } from "./prisma-repo.js";
import { getSession } from "./auth.js"; // Auth.js / proveedor de sesión

const ids = {
  id: () => randomUUID(),
  // Código legible e irrepetible: 4-4-4. La unicidad real la garantiza el unique
  // de base; ante colisión improbable, el caller reintenta.
  code: () => randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase().replace(/(.{4})(.{4})(.{4})/, "$1-$2-$3"),
};
const clock = { now: () => new Date() };
const deps = { repo: prismaRewardsRepo, clock, ids, rng: cryptoRng };

const app = new Hono();

// Middleware: exige sesión. Sin login no se juega (regla de la especificación).
app.use("/api/*", async (c, next) => {
  const session = await getSession(c.req.raw);
  if (!session?.userId) return c.json({ error: "auth_required" }, 401);
  c.set("userId", session.userId);
  await next();
});

// POST /api/play  — body: { idempotencyKey }
app.post("/api/play", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json().catch(() => ({}));
  const idempotencyKey = body.idempotencyKey;
  if (typeof idempotencyKey !== "string" || idempotencyKey.length < 8) {
    return c.json({ error: "invalid_idempotency_key" }, 400);
  }
  const prize = await playGame(deps, { userId, idempotencyKey });
  return c.json({ prize });
});

// GET /api/prizes  — "Mis Premios"
app.get("/api/prizes", async (c) => {
  const userId = c.get("userId") as string;
  const prizes = await getMyPrizes(deps, userId);
  return c.json({ prizes });
});

// POST /api/prizes/:id/use  — "Usar ahora"
app.post("/api/prizes/:id/use", async (c) => {
  const userId = c.get("userId") as string;
  const prizeId = c.req.param("id");
  try {
    const prize = await usePrize(deps, { userId, prizeId });
    return c.json({ prize });
  } catch (err) {
    if (err instanceof OwnershipError) return c.json({ error: "forbidden" }, 403);
    return c.json({ error: (err as Error).message }, 409);
  }
});

// POST /api/cron/expire — invocado por Vercel Cron (protegido por header secreto).
app.post("/api/cron/expire", async (c) => {
  if (c.req.header("x-cron-secret") !== process.env.CRON_SECRET) {
    return c.json({ error: "forbidden" }, 403);
  }
  const expired = await expireSweep(deps);
  return c.json({ expired });
});

export default app;
