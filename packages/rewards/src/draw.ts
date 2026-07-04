/**
 * Tirada (draw) ponderada y *server-authoritative*.
 *
 * El resultado se decide SIEMPRE acá, en el servidor. El cliente solo recibe el
 * premio ya resuelto y lo anima. Esto cierra la puerta a manipular el resultado
 * desde el navegador.
 *
 * La aleatoriedad se inyecta (`Rng`) para que en tests sea determinística y en
 * producción use `crypto`. Nunca `Math.random()` para algo con valor económico.
 */
import type { Reward } from "./types.js";

/** Fuente de aleatoriedad: devuelve un float en [0, 1). */
export type Rng = () => number;

/** RNG criptográfico por defecto (Web Crypto, disponible en Node 18+ y edge). */
export const cryptoRng: Rng = () => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 0x100000000;
};

/**
 * Elige un reward respetando los pesos. Solo considera rewards activos.
 * Lanza si no hay candidatos válidos (config inválida => fallar ruidosamente).
 */
export function drawReward(rewards: Reward[], rng: Rng = cryptoRng): Reward {
  const pool = rewards.filter((r) => r.active && r.weight > 0);
  if (pool.length === 0) {
    throw new Error("No hay rewards activos con peso positivo para la tirada.");
  }

  const total = pool.reduce((sum, r) => sum + r.weight, 0);
  let threshold = rng() * total;

  for (const reward of pool) {
    threshold -= reward.weight;
    if (threshold < 0) return reward;
  }
  // Fallback por imprecisión de punto flotante: el último elemento.
  return pool[pool.length - 1];
}
