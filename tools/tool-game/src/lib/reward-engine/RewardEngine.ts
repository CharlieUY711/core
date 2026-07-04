import type {
  Reward, RewardAssignment, RewardAudit, CartRewardPayload,
} from "./types";

export class RewardEngine {
  constructor(private readonly tenantId: string) {}

  /** Selecciona premio por probabilidad ponderada */
  spin(rewards: Reward[]): Reward | null {
    const available = rewards.filter((r) => this.isAvailable(r));
    if (!available.length) return null;

    const total = available.reduce((s, r) => s + r.probability, 0);
    let rand = Math.random() * total;
    for (const r of available) {
      rand -= r.probability;
      if (rand <= 0) return r;
    }
    return available[available.length - 1];
  }

  isAvailable(reward: Reward): boolean {
    const now = Date.now();
    if (now < new Date(reward.startsAt).getTime())  return false;
    if (now > new Date(reward.expiresAt).getTime()) return false;
    if (reward.stock !== null && reward.stockUsed >= reward.stock) return false;
    return true;
  }

  /** Valida assignment durante checkout */
  validate(
    assignment: RewardAssignment,
    cartAmount = 0,
    minAmount = 0,
  ): { valid: boolean; reason?: string } {
    if (new Date(assignment.expiresAt) < new Date()) return { valid: false, reason: "expired" };
    if (assignment.status !== "active")              return { valid: false, reason: assignment.status };
    if (assignment.tenantId !== this.tenantId)       return { valid: false, reason: "tenant_mismatch" };
    if (cartAmount < minAmount)                      return { valid: false, reason: "min_amount" };
    return { valid: true };
  }

  /** Construye payload para escribir en el carrito de Market */
  buildCartPayload(assignment: RewardAssignment, reward: Reward): CartRewardPayload {
    return {
      reward_id:         reward.id,
      reward_status:     "active",
      reward_expires_at: assignment.expiresAt,
      reward_metadata: {
        campaignId:   reward.campaignId,
        assignmentId: assignment.id,
        rewardType:   reward.type,
        value:        reward.value,
        productId:    reward.productId,
        categoryId:   reward.categoryId,
      },
    };
  }

  /** Genera entrada de auditoría */
  audit(
    entity:   RewardAudit["entity"],
    entityId: string,
    action:   string,
    userId:   string,
    before?:  unknown,
    after?:   unknown,
  ): RewardAudit {
    return {
      id: crypto.randomUUID(),
      entity, entityId, action, before, after,
      userId,
      tenantId:  this.tenantId,
      timestamp: new Date().toISOString(),
    };
  }
}
