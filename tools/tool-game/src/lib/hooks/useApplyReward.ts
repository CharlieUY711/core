"use client";
import { useMutation } from "@tanstack/react-query";
import {
  applyRewardToCart,
  removeRewardFromCart,
  validateRewardCheckout,
} from "@/lib/market-integration/marketAdapter";
import { RewardEngine } from "@/lib/reward-engine/RewardEngine";
import type { RewardAssignment, CartRewardPayload } from "@/lib/reward-engine/types";

export function useApplyReward(tenantId: string) {
  const engine = new RewardEngine(tenantId);

  const apply = useMutation({
    mutationFn: ({ cartId, payload }: { cartId: string; payload: CartRewardPayload }) =>
      applyRewardToCart(cartId, payload),
  });

  const remove = useMutation({
    mutationFn: ({ cartId, rewardId }: { cartId: string; rewardId: string }) =>
      removeRewardFromCart(cartId, rewardId),
  });

  async function validateCheckout(
    assignment: RewardAssignment,
    cartId:     string,
    cartAmount  = 0,
  ) {
    // Validación local primero
    const local = engine.validate(assignment, cartAmount);
    if (!local.valid) return local;
    // Luego validación remota en Market
    return validateRewardCheckout(assignment, cartId);
  }

  return { apply, remove, validateCheckout };
}
