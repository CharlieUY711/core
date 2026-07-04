"use client";
import { useMemo } from "react";
import { RewardEngine } from "@/lib/reward-engine/RewardEngine";
import type { Reward, RewardAssignment } from "@/lib/reward-engine/types";

export function useRewardEngine(tenantId: string) {
  const engine = useMemo(() => new RewardEngine(tenantId), [tenantId]);

  return {
    spin:     (rewards: Reward[]) => engine.spin(rewards),
    validate: (a: RewardAssignment, cart = 0, min = 0) => engine.validate(a, cart, min),
    engine,
  };
}
